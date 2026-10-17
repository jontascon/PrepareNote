from django.conf import settings
from django.db import models


# Create your models here.
class Note(models.Model):
    note_id = models.AutoField(primary_key=True)
    user_name = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    # Where the note lives in the study hierarchy (Exam > Section > Topic > Note).
    # PROTECT stops a topic from being deleted while notes still use it.
    topic = models.ForeignKey("exams.Topic", on_delete=models.PROTECT, related_name="notes")
    content = models.TextField()

    @property
    def section(self):
        return self.topic.section

    @property
    def exam(self):
        return self.topic.section.exam

    def __str__(self):
        return f"Note {self.note_id} in {self.topic}"
