from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from preparenote.quickstart.models import Note


class StudyStatusTests(APITestCase):

    def setUp(self):
        self.user = get_user_model().objects.create_user("student", password="Testing987@")
        self.client.force_authenticate(user=self.user)

    def test_new_note_starts_as_learning(self):
        response = self.client.post("/notes/", {"title": "Subnetting", "content": "A /24 has 256 addresses."})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["note"]["study_status"], "learning")
        self.assertEqual(Note.objects.get().study_status, Note.StudyStatus.LEARNING)

    def test_create_note_with_a_study_status(self):
        response = self.client.post("/notes/", {
            "title": "Subnetting",
            "content": "A /24 has 256 addresses.",
            "study_status": "reviewing",
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["note"]["study_status"], "reviewing")

    def test_unknown_study_status_is_rejected(self):
        response = self.client.post("/notes/", {
            "title": "Subnetting",
            "content": "A /24 has 256 addresses.",
            "study_status": "done",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertFalse(Note.objects.exists())

    def test_update_study_status(self):
        note = Note.objects.create(user=self.user, title="Subnetting", content="A /24 has 256 addresses.")

        response = self.client.put(f"/notes/{note.note_id}/", {
            "title": "Subnetting",
            "content": "A /24 has 256 addresses.",
            "study_status": "confident",
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note.refresh_from_db()
        self.assertEqual(note.study_status, Note.StudyStatus.CONFIDENT)

    def test_update_without_study_status_keeps_the_current_one(self):
        note = Note.objects.create(
            user=self.user,
            title="Subnetting",
            content="A /24 has 256 addresses.",
            study_status=Note.StudyStatus.REVIEWING,
        )

        response = self.client.put(f"/notes/{note.note_id}/", {"title": "Subnets", "content": "Fixed the title."})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note.refresh_from_db()
        self.assertEqual(note.study_status, Note.StudyStatus.REVIEWING)

    def test_notes_list_shows_each_study_status(self):
        Note.objects.create(user=self.user, title="VPC", content="Not transitive.", study_status="confident")
        Note.objects.create(user=self.user, title="Route 53", content="Alias records.", study_status="learning")

        response = self.client.get("/notes/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        statuses = [note["study_status"] for note in response.data["notes"]]
        self.assertEqual(statuses, ["confident", "learning"])
