from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.test import TestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

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


class ExamApiTests(APITestCase):

    def setUp(self):
        self.user = get_user_model().objects.create_user("student", password="pass12345")
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)
        self.exam = Exam.objects.create(name="AWS Solutions Architect")
        self.networking = Section.objects.create(exam=self.exam, name="Networking", order=1)
        self.vpc = Topic.objects.create(section=self.networking, name="VPC Peering", order=1)
        self.dns = Topic.objects.create(section=self.networking, name="Route 53", order=2)

    def test_exams_list_shows_sections_and_topics(self):
        response = self.client.get("/exams/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        exam = response.data["exams"][0]
        self.assertEqual(exam["name"], "AWS Solutions Architect")
        self.assertEqual(exam["sections"][0]["name"], "Networking")
        topic_names = [topic["name"] for topic in exam["sections"][0]["topics"]]
        self.assertEqual(topic_names, ["VPC Peering", "Route 53"])

    def test_exams_list_needs_a_login(self):
        self.client.credentials()
        response = self.client.get("/exams/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_note_can_be_saved_under_a_topic(self):
        response = self.client.post("/notes/", {
            "title": "Peering",
            "content": "Peering is not transitive.",
            "topic_id": self.vpc.id,
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["note"]["topic_id"], self.vpc.id)
        note = Note.objects.get(note_id=response.data["note"]["note_id"])
        self.assertEqual(note.topic, self.vpc)
        self.assertEqual(note.exam, self.exam)

    def test_note_with_an_unknown_topic_is_rejected(self):
        response = self.client.post("/notes/", {
            "title": "Peering",
            "content": "Peering is not transitive.",
            "topic_id": 9999,
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Note.objects.exists())

    def test_note_topic_can_be_changed_and_removed(self):
        note = Note.objects.create(user=self.user, title="DNS", content="Alias records are free.", topic=self.vpc)

        response = self.client.put("/notes/" + str(note.note_id) + "/", {
            "title": "DNS",
            "content": "Alias records are free.",
            "topic_id": self.dns.id,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note.refresh_from_db()
        self.assertEqual(note.topic, self.dns)

        response = self.client.put("/notes/" + str(note.note_id) + "/", {
            "title": "DNS",
            "content": "Alias records are free.",
            "topic_id": None,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note.refresh_from_db()
        self.assertIsNone(note.topic)

    def test_notes_list_includes_the_topic(self):
        Note.objects.create(user=self.user, title="Peering", content="Not transitive.", topic=self.vpc)
        Note.objects.create(user=self.user, title="Loose", content="No topic yet.")

        response = self.client.get("/notes/")

        self.assertEqual(response.data["notes"][0]["topic_id"], self.vpc.id)
        self.assertIsNone(response.data["notes"][1]["topic_id"])
