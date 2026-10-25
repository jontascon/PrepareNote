from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.test import TestCase

from preparenote.quickstart.models import Note

from .models import Exam, Section, Topic


class ExamHierarchyTests(TestCase):
    """Covers the acceptance criteria for issue #7."""

    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user("student", password="pass12345")
        cls.exam = Exam.objects.create(name="AWS Solutions Architect")
        cls.networking = Section.objects.create(exam=cls.exam, name="Networking", order=1)
        cls.storage = Section.objects.create(exam=cls.exam, name="Storage", order=2)
        cls.vpc = Topic.objects.create(section=cls.networking, name="VPC Peering", order=1)
        cls.dns = Topic.objects.create(section=cls.networking, name="Route 53", order=2)

    def test_exam_contains_multiple_sections(self):
        self.assertQuerySetEqual(self.exam.sections.all(), [self.networking, self.storage])

    def test_section_contains_multiple_topics(self):
        self.assertQuerySetEqual(self.networking.topics.all(), [self.vpc, self.dns])

    def test_topic_contains_multiple_notes(self):
        first = Note.objects.create(user=self.user, topic=self.vpc, content="Peering is not transitive.")
        second = Note.objects.create(user=self.user, topic=self.vpc, content="CIDR blocks cannot overlap.")
        self.assertCountEqual(self.vpc.notes.all(), [first, second])

    def test_note_knows_its_topic_section_and_exam(self):
        note = Note.objects.create(user=self.user, topic=self.dns, content="Alias records are free.")
        self.assertEqual(note.topic, self.dns)
        self.assertEqual(note.section, self.networking)
        self.assertEqual(note.exam, self.exam)

    def test_note_can_be_saved_before_a_topic_is_picked(self):
        note = Note.objects.create(user=self.user, content="No topic yet.")
        self.assertIsNone(note.topic)
        self.assertIsNone(note.section)
        self.assertIsNone(note.exam)

    def test_section_names_are_unique_within_an_exam(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Section.objects.create(exam=self.exam, name="Networking")
        other_exam = Exam.objects.create(name="CompTIA Network+")
        Section.objects.create(exam=other_exam, name="Networking")  # allowed in a different exam

    def test_topic_names_are_unique_within_a_section(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Topic.objects.create(section=self.networking, name="VPC Peering")
        Topic.objects.create(section=self.storage, name="VPC Peering")  # allowed in a different section

    def test_topic_with_notes_cannot_be_deleted(self):
        Note.objects.create(user=self.user, topic=self.vpc, content="Keep me.")
        with self.assertRaises(ProtectedError):
            self.vpc.delete()

    def test_deleting_an_empty_exam_removes_its_sections_and_topics(self):
        self.exam.delete()
        self.assertFalse(Section.objects.exists())
        self.assertFalse(Topic.objects.exists())

    def test_string_labels_show_the_full_path(self):
        self.assertEqual(str(self.vpc), "AWS Solutions Architect > Networking > VPC Peering")
