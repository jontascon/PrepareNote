from django.shortcuts import render, get_object_or_404
from django.forms.models import model_to_dict
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.core import serializers
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
import json
from django.http import JsonResponse
from preparenote.quickstart.models import Note


# Create your views here.
@api_view(['POST'])
@permission_classes([AllowAny])
def createUser(request):
    # Initiliaze response
    response = {}
    response_status = status.HTTP_200_OK

    # Try to create the user
    try:
        user = User.objects.create_user(request.data.get('username'), email=request.data.get('email'), password=request.data.get('password'))
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

# Note CRUD functionality
class ListNotes(ListView):
    model = Note

    def get(self, request):
        queryset = self.get_queryset()

        data = serializers.serialize('json', queryset)
        return JsonResponse(json.loads(data), safe=False)

class DetailNote(DetailView):
    model = Note

    def get(self, request):
            queryset = self.get_queryset()
    
            data = serializers.serialize('json', queryset)
            return JsonResponse(json.loads(data), safe=False)

class CreateNote(CreateView):
    model = Note

class UpdateNote(UpdateView):
    model = Note

class DeleteNote(DeleteView):
    model = Note
