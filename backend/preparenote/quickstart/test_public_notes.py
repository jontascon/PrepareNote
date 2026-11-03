from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from preparenote.quickstart.models import Note


class PublicPrivateNoteTests(APITestCase):

    def setUp(self):
        self.owner = get_user_model().objects.create_user("owner", password="Testing987@")
        self.other = get_user_model().objects.create_user("classmate", password="Testing987@")
        self.private_note = Note.objects.create(user=self.owner, title="Mine", content="Only for me.")
        self.public_note = Note.objects.create(user=self.owner, title="Shared", content="For everyone.", is_public=True)

    def test_new_note_is_private_by_default(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post("/notes/", {"title": "Subnetting", "content": "A /24 has 256 addresses."})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["note"]["is_public"])

    def test_create_a_public_note(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            "/notes/",
            {"title": "Subnetting", "content": "A /24 has 256 addresses.", "is_public": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["note"]["is_public"])

    def test_owner_can_view_their_private_note(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(f"/notes/{self.private_note.note_id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["note"]["is_public"])

    def test_other_user_cannot_view_a_private_note(self):
        self.client.force_authenticate(user=self.other)

        response = self.client.get(f"/notes/{self.private_note.note_id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_other_user_can_view_a_public_note(self):
        self.client.force_authenticate(user=self.other)

        response = self.client.get(f"/notes/{self.public_note.note_id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["note"]["title"], "Shared")
        self.assertEqual(response.data["note"]["username"], "owner")

    def test_other_user_cannot_edit_or_delete_a_public_note(self):
        self.client.force_authenticate(user=self.other)

        edit = self.client.put(f"/notes/{self.public_note.note_id}/", {"title": "Changed", "content": "Changed."})
        delete = self.client.delete(f"/notes/{self.public_note.note_id}/")

        self.assertEqual(edit.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(delete.status_code, status.HTTP_403_FORBIDDEN)
        self.public_note.refresh_from_db()
        self.assertEqual(self.public_note.title, "Shared")

    def test_private_notes_stay_out_of_other_users_lists(self):
        self.client.force_authenticate(user=self.other)

        response = self.client.get("/notes/")

        self.assertEqual(response.data["notes"], [])

    def test_owner_can_make_a_public_note_private_again(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.put(
            f"/notes/{self.public_note.note_id}/",
            {"title": "Shared", "content": "For everyone.", "is_public": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.other)
        response = self.client.get(f"/notes/{self.public_note.note_id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_without_is_public_keeps_the_current_setting(self):
        self.client.force_authenticate(user=self.owner)

        self.client.put(f"/notes/{self.public_note.note_id}/", {"title": "Shared", "content": "Edited."})

        self.public_note.refresh_from_db()
        self.assertTrue(self.public_note.is_public)
