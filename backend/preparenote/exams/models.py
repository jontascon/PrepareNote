"""
Study hierarchy for PrepareNote: Exam > Section > Topic > Note.

Each level points to its parent with a ForeignKey, so:
    exam.sections.all()     -> every section in an exam
    section.topics.all()    -> every topic in a section
    topic.notes.all()       -> every note in a topic (Note lives in quickstart)

A note only stores its topic. Its section and exam are read through the
topic, so a note can never end up pointing at a section from a different exam.
"""

from django.db import models


class Exam(models.Model):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Section(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="sections")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0, help_text="Position of this section within its exam.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["exam", "order", "name"]
        constraints = [
            models.UniqueConstraint(fields=["exam", "name"], name="unique_section_name_per_exam"),
        ]

    def __str__(self):
        return f"{self.exam} > {self.name}"


class Topic(models.Model):
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="topics")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0, help_text="Position of this topic within its section.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["section", "order", "name"]
        constraints = [
            models.UniqueConstraint(fields=["section", "name"], name="unique_topic_name_per_section"),
        ]

    @property
    def exam(self):
        return self.section.exam

    def __str__(self):
        return f"{self.section} > {self.name}"
