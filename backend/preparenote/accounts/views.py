from django.contrib.auth import password_validation
from django.contrib.auth.models import User
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view
from rest_framework.response import Response
from preparenote.quickstart.models import Note


# Profile for the logged in user (issue #19).
def profileToDict(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_moderator": user.is_staff,
        "date_joined": user.date_joined.date().isoformat(),
        "note_count": Note.objects.filter(user=user).count(),
        "public_note_count": Note.objects.filter(user=user, is_public=True).count(),
    }

def checkProfileData(user, username, email):
    if username == '' or email == '':
        return "Username and email are required."
    if len(username) > 150:
        return "Username must be 150 characters or fewer."
    try:
        UnicodeUsernameValidator()(username)
    except ValidationError:
        return "Username can only use letters, numbers and @ . + - _"
    if User.objects.filter(username=username).exclude(id=user.id).exists():
        return "A user with that username already exists."
    if len(email) > 254:
        return "Email must be 254 characters or fewer."
    try:
        validate_email(email)
    except ValidationError:
        return "Please enter a valid email address."
    return None

@api_view(['GET', 'PUT'])
def profile(request):
    user = request.user

    if request.method == 'PUT':
        username = (request.data.get('username') or '').strip()
        email = (request.data.get('email') or '').strip()
        error = checkProfileData(user, username, email)
        if error is not None:
            return Response({"success": False, "error": error}, status=status.HTTP_400_BAD_REQUEST)

        user.username = username
        user.email = email
        user.save()

    return Response({"success": True, "profile": profileToDict(user)})

# Changing the password also replaces the login token,
# so any other device that was logged in has to log in again.
@api_view(['POST'])
def changePassword(request):
    user = request.user
    current_password = request.data.get('current_password') or ''
    new_password = request.data.get('new_password') or ''

    if current_password == '' or new_password == '':
        return Response({"success": False, "error": "Current and new password are required."}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(current_password):
        return Response({"success": False, "error": "Your current password is not correct."}, status=status.HTTP_400_BAD_REQUEST)

    if new_password == current_password:
        return Response({"success": False, "error": "Your new password must be different from your current password."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        password_validation.validate_password(new_password, user)
    except ValidationError as e:
        return Response({"success": False, "error": " ".join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()

    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)
    return Response({"success": True, "token": token.key})
