from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from preparenote.quickstart.models import Note
from preparenote.exams.models import Topic


# Create your views here.
@api_view(['POST'])
@permission_classes([AllowAny])
def createUser(request):
    # Initiliaze response
    response = {}
    response_status = status.HTTP_200_OK

    username = request.data.get('username') or ''
    email = request.data.get('email') or ''
    password = request.data.get('password') or ''

    if username == '' or email == '' or password == '':
        response = {"success": False, "error": "Username, email and password are required."}
        return Response(response, status=status.HTTP_400_BAD_REQUEST)

    if len(username) > 150:
        response = {"success": False, "error": "Username must be 150 characters or fewer."}
        return Response(response, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        response = {"success": False, "error": "A user with that username already exists."}
        return Response(response, status=status.HTTP_400_BAD_REQUEST)

    # Try to create the user
    try:
        user = User.objects.create_user(username, email=email, password=password)
        response = {"success": True}
        response_status = status.HTTP_201_CREATED
    except Exception as e:
        response = {"success": False, "error": str(e)}
        response_status = status.HTTP_400_BAD_REQUEST

    return Response(response, status=response_status)

@api_view(['POST'])
@permission_classes([AllowAny])
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
            "id": user.id,
            "token": Token.objects.get_or_create(user=user)[0].key,
            "is_moderator": user.is_staff
        }
    else:
        response = {
            "success": False,
            "error": "Invalid username or password"
        }
        response_status = status.HTTP_401_UNAUTHORIZED

    return Response(response, status=response_status)

@api_view(['POST'])
def logoutUser(request):
    request.auth.delete()
    return Response({"success": True})

# Note CRUD functionality
def noteToDict(note):
    return {
        "note_id": note.note_id,
        "title": note.title,
        "content": note.content,
        "study_status": note.study_status,
        "topic_id": note.topic_id,
    }

def findTopic(topic_id):
    if str(topic_id).isdigit():
        return Topic.objects.filter(id=topic_id).first()
    return None

def checkNoteData(title, content, study_status):
    if title == '' or content == '':
        return "Title and content are required."
    if len(title) > 200:
        return "Title must be 200 characters or fewer."
    if study_status not in Note.StudyStatus.values:
        return "Study status must be learning, reviewing or confident."
    return None

@api_view(['GET', 'POST'])
def notes(request):
    if request.method == 'GET':
        user_notes = Note.objects.filter(user=request.user).order_by('note_id')
        note_list = []
        for note in user_notes:
            note_list.append(noteToDict(note))
        return Response({"success": True, "notes": note_list})

    title = request.data.get('title') or ''
    content = request.data.get('content') or ''
    study_status = request.data.get('study_status') or Note.StudyStatus.LEARNING
    error = checkNoteData(title, content, study_status)
    if error is not None:
        return Response({"success": False, "error": error}, status=status.HTTP_400_BAD_REQUEST)

    topic = None
    topic_id = request.data.get('topic_id')
    if topic_id is not None and topic_id != '':
        topic = findTopic(topic_id)
        if topic is None:
            return Response({"success": False, "error": "Topic not found."}, status=status.HTTP_400_BAD_REQUEST)

    note = Note.objects.create(user=request.user, title=title, content=content, study_status=study_status, topic=topic)
    return Response({"success": True, "note": noteToDict(note)}, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
def noteDetail(request, note_id):
    note = Note.objects.filter(note_id=note_id, user=request.user).first()
    if note is None:
        return Response({"success": False, "error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({"success": True, "note": noteToDict(note)})

    if request.method == 'PUT':
        title = request.data.get('title') or ''
        content = request.data.get('content') or ''
        study_status = request.data.get('study_status') or note.study_status
        error = checkNoteData(title, content, study_status)
        if error is not None:
            return Response({"success": False, "error": error}, status=status.HTTP_400_BAD_REQUEST)

        topic = note.topic
        if 'topic_id' in request.data:
            topic = None
            topic_id = request.data.get('topic_id')
            if topic_id is not None and topic_id != '':
                topic = findTopic(topic_id)
                if topic is None:
                    return Response({"success": False, "error": "Topic not found."}, status=status.HTTP_400_BAD_REQUEST)

        note.title = title
        note.content = content
        note.study_status = study_status
        note.topic = topic
        note.save()
        return Response({"success": True, "note": noteToDict(note)})

    note.delete()
    return Response({"success": True})
