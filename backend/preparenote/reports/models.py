"""
Reports on public notes.

A user can report another user's public note once, with a reason, so a
moderator can review it later (moderator review is issue #23).
"""

from django.conf import settings
from django.db import models


class Report(models.Model):
    REASON_MAX_LENGTH = 500

    note = models.ForeignKey("quickstart.Note", on_delete=models.CASCADE, related_name="reports")
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports")
    reason = models.CharField(max_length=REASON_MAX_LENGTH)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["note", "reporter"], name="unique_report_per_user_and_note"),
        ]

    def __str__(self):
        return f"Report on note {self.note_id} by {self.reporter}"
