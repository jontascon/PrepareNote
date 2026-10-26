from django.conf import settings
from django.db import models


# Create your models here.
class Note(models.Model):
    class StudyStatus(models.TextChoices):
        LEARNING = "learning", "Learning"
        REVIEWING = "reviewing", "Reviewing"
        CONFIDENT = "confident", "Confident"

    note_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=200, default="")
    content = models.TextField()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    study_status = models.CharField(
        max_length=20,
        choices=StudyStatus.choices,
        default=StudyStatus.LEARNING,
    )
    # Where the note lives in the study hierarchy (Exam > Section > Topic > Note).
    # PROTECT stops a topic from being deleted while notes still use it.
    topic = models.ForeignKey(
        "exams.Topic",
        on_delete=models.PROTECT,
        related_name="notes",
        null=True,
        blank=True,
    )

    @property
    def section(self):
        if self.topic is None:
            return None
        return self.topic.section

    @property
    def exam(self):
        if self.topic is None:
            return None
        return self.topic.section.exam

    def __str__(self):
        if self.topic is None:
            return f"Note {self.note_id}"
        return f"Note {self.note_id} in {self.topic}"
