from django.shortcuts import render
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db import transaction, IntegrityError
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
import json

# Create your views here.
@api_view(['POST'])
def createUser(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')

    # Require all registration fields
    if not username or not email or not password:
        return Response(
            {"success": False, "error": "Username, email, and password are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Reject duplicate usernames before saving
    if User.objects.filter(username=username).exists():
        return Response(
            {"success": False, "error": "Username already exists"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        with transaction.atomic():
            User.objects.create_user(username, email=email, password=password)
    except IntegrityError:
        return Response(
            {"success": False, "error": "Unable to create user"},
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response({"success": True}, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def getUser(request):
    # Initialize response
    response = {}
    response_status = status.HTTP_200_OK

    # Get the user info
    user = authenticate(username=request.data.get('username'), password=request.data.get('password'));
    if user is not None:
        response = {
            "success": True,
            "username": user.username,
            "email": user.email,
            "id": user.id
        }
    else:
        response = {
            "success": False,
            "error": "Invalid username or password"
        }
        response_status = status.HTTP_401_UNAUTHORIZED

    return Response(response, status=response_status)
