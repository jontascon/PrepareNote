from django.db import models

# Create your models here.
class Note(models.Model):
    note_id = models.AutoField(primary_key=True)
    user_name = models.ForeignKey('user', on_delete=models.CASCADE)
    content = models.TextField()