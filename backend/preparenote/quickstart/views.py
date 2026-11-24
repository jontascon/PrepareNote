from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from preparenote.quickstart.models import Note
from preparenote.exams.models import Topic
from preparenote.reports.models import Report


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
        "is_public": note.is_public,
        "username": note.user.username,
        "topic_id": note.topic_id,
        "source": note.source
    }

def readIsPublic(value):
    return value is True or str(value).lower() == 'true'

def findTopic(topic_id):
    if str(topic_id).isdigit():
        return Topic.objects.filter(id=topic_id).first()
    return None

def topicName(topic):
    if topic is None:
        return None
    return topic.section.exam.name + " > " + topic.section.name + " > " + topic.name

def checkNoteData(title, content, study_status):
    if title == '' or content == '':
        return "Title and content are required."
    if len(title) > 200:
        return "Title must be 200 characters or fewer."
    if study_status not in Note.StudyStatus.values:
        return "Study status must be learning, reviewing or confident."
    return None

# Search and filters for the notes lists (issue #21).
# Every filter is optional, so with no filters you get the whole list.
def filterNotes(note_list, params):
    search = (params.get('search') or '').strip()
    if len(search) > 200:
        return None, "Search must be 200 characters or fewer."
    if search != '':
        note_list = note_list.filter(Q(title__icontains=search) | Q(content__icontains=search))

    study_status = params.get('study_status') or ''
    if study_status != '':
        if study_status not in Note.StudyStatus.values:
            return None, "Study status must be learning, reviewing or confident."
        note_list = note_list.filter(study_status=study_status)

    exam_id = params.get('exam_id') or ''
    if exam_id != '':
        if not exam_id.isdigit():
            return None, "Exam must be a number."
        note_list = note_list.filter(topic__section__exam_id=int(exam_id))

    topic_id = params.get('topic_id') or ''
    if topic_id != '':
        if not topic_id.isdigit():
            return None, "Topic must be a number."
        note_list = note_list.filter(topic_id=int(topic_id))

    return note_list, None

@api_view(['GET', 'POST'])
def notes(request):
    if request.method == 'GET':
        user_notes = Note.objects.filter(user=request.user).order_by('note_id')
        user_notes, error = filterNotes(user_notes, request.query_params)
        if error is not None:
            return Response({"success": False, "error": error}, status=status.HTTP_400_BAD_REQUEST)

        visibility = request.query_params.get('visibility') or ''
        if visibility == 'public':
            user_notes = user_notes.filter(is_public=True)
        elif visibility == 'private':
            user_notes = user_notes.filter(is_public=False)
        elif visibility != '':
            return Response({"success": False, "error": "Visibility must be public or private."}, status=status.HTTP_400_BAD_REQUEST)

        note_list = []
        for note in user_notes:
            note_list.append(noteToDict(note))
        return Response({"success": True, "notes": note_list})

    title = request.data.get('title') or ''
    content = request.data.get('content') or ''
    study_status = request.data.get('study_status') or Note.StudyStatus.LEARNING
    source = request.data.get('source') or ''
    error = checkNoteData(title, content, study_status)
    if error is not None:
        return Response({"success": False, "error": error}, status=status.HTTP_400_BAD_REQUEST)

    topic = None
    topic_id = request.data.get('topic_id')
    if topic_id is not None and topic_id != '':
        topic = findTopic(topic_id)
        if topic is None:
            return Response({"success": False, "error": "Topic not found."}, status=status.HTTP_400_BAD_REQUEST)

    is_public = readIsPublic(request.data.get('is_public'))
    note = Note.objects.create(
        user=request.user,
        title=title,
        content=content,
        study_status=study_status,
        is_public=is_public,
        topic=topic,
        source=source
    )
    return Response({"success": True, "note": noteToDict(note)}, status=status.HTTP_201_CREATED)

# Public notes shared by other users, newest first.
# Your own public notes are already on your My Notes page.
@api_view(['GET'])
def publicNotes(request):
    shared_notes = (
        Note.objects.filter(is_public=True)
        .exclude(user=request.user)
        .select_related('user', 'topic__section__exam')
        .order_by('-note_id')
    )
    shared_notes, error = filterNotes(shared_notes, request.query_params)
    if error is not None:
        return Response({"success": False, "error": error}, status=status.HTTP_400_BAD_REQUEST)

    reported_ids = set(Report.objects.filter(reporter=request.user).values_list('note_id', flat=True))
    note_list = []
    for note in shared_notes:
        note_data = noteToDict(note)
        note_data["topic_name"] = topicName(note.topic)
        note_data["reported"] = note.note_id in reported_ids
        note_list.append(note_data)
    return Response({"success": True, "notes": note_list})

@api_view(['GET', 'PUT', 'DELETE'])
def noteDetail(request, note_id):
    note = Note.objects.filter(note_id=note_id).first()
    if note is None or (note.user != request.user and not note.is_public):
        return Response({"success": False, "error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({"success": True, "note": noteToDict(note)})

    if note.user != request.user:
        return Response({"success": False, "error": "You can only change your own notes."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PUT':
        title = request.data.get('title') or ''
        content = request.data.get('content') or ''
        study_status = request.data.get('study_status') or note.study_status
        source = request.data.get('source') if "source" in request.data.keys() else note.source
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
        note.source = source
        if 'is_public' in request.data:
            note.is_public = readIsPublic(request.data.get('is_public'))
        note.topic = topic
        note.save()
        return Response({"success": True, "note": noteToDict(note)})

    note.delete()
    return Response({"success": True})