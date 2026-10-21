from django.shortcuts import render
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
import json

# Create your views here.
@api_view(['POST'])
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
            "error": str(e)
        }
        response_status = status.HTTP_401_UNAUTHORIZED

    return Response(response, status=response_status)
