from django.db import models

# Create your models here.
class Note(models.Model):
    note_id = models.AutoField(primary_key=True)
    content = models.TextField()