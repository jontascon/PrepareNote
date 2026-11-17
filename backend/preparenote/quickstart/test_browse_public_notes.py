from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from preparenote.exams.models import Exam, Section, Topic
from preparenote.quickstart.models import Note


class BrowsePublicNotesTests(APITestCase):
    """Covers the acceptance criteria for issue #20."""

    def setUp(self):
        self.reader = get_user_model().objects.create_user("reader", password="Testing987@")
        self.writer = get_user_model().objects.create_user("writer", password="Testing987@")
        exam = Exam.objects.create(name="AWS")
        section = Section.objects.create(exam=exam, name="Networking")
        self.topic = Topic.objects.create(section=section, name="VPC Peering")

    def browse(self):
        self.client.force_authenticate(user=self.reader)
        return self.client.get("/notes/public/")

    def test_lists_public_notes_from_other_users(self):
        Note.objects.create(user=self.writer, title="Peering", content="Not transitive.", is_public=True)

        response = self.browse()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(len(response.data["notes"]), 1)
        self.assertEqual(response.data["notes"][0]["title"], "Peering")
        self.assertEqual(response.data["notes"][0]["content"], "Not transitive.")
        self.assertEqual(response.data["notes"][0]["username"], "writer")

    def test_private_notes_are_not_listed(self):
        Note.objects.create(user=self.writer, title="Secret", content="Only mine.")

        response = self.browse()

        self.assertEqual(response.data["notes"], [])

    def test_your_own_public_notes_are_not_listed(self):
        Note.objects.create(user=self.reader, title="Mine", content="Shared by me.", is_public=True)

        response = self.browse()

        self.assertEqual(response.data["notes"], [])

    def test_newest_public_notes_come_first(self):
        Note.objects.create(user=self.writer, title="Older", content="First.", is_public=True)
        Note.objects.create(user=self.writer, title="Newer", content="Second.", is_public=True)

        response = self.browse()

        titles = [note["title"] for note in response.data["notes"]]
        self.assertEqual(titles, ["Newer", "Older"])

    def test_shows_the_full_topic_name(self):
        Note.objects.create(user=self.writer, title="Peering", content="Not transitive.", is_public=True, topic=self.topic)

        response = self.browse()

        self.assertEqual(response.data["notes"][0]["topic_id"], self.topic.id)
        self.assertEqual(response.data["notes"][0]["topic_name"], "AWS > Networking > VPC Peering")

    def test_note_without_a_topic_has_no_topic_name(self):
        Note.objects.create(user=self.writer, title="Loose note", content="No topic.", is_public=True)

        response = self.browse()

        self.assertIsNone(response.data["notes"][0]["topic_id"])
        self.assertIsNone(response.data["notes"][0]["topic_name"])

    def test_note_made_private_again_leaves_the_list(self):
        note = Note.objects.create(user=self.writer, title="Peering", content="Not transitive.", is_public=True)
        note.is_public = False
        note.save()

        response = self.browse()

        self.assertEqual(response.data["notes"], [])

    def test_empty_list_when_nobody_has_shared_notes(self):
        response = self.browse()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["notes"], [])

    def test_must_be_logged_in_to_browse(self):
        Note.objects.create(user=self.writer, title="Peering", content="Not transitive.", is_public=True)

        response = self.client.get("/notes/public/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("notes", response.data)

    def test_cannot_create_a_note_through_the_browse_route(self):
        self.client.force_authenticate(user=self.reader)

        response = self.client.post("/notes/public/", {"title": "Sneaky", "content": "Should not save."})

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(Note.objects.count(), 0)
