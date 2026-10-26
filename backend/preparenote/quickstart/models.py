from django.db import models
from django.conf import settings

# Create your models here.
class Note(models.Model):
    note_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=200, default="")
    content = models.TextField()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)