from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from preparenote.quickstart.models import Bookmark, Note


class BookmarkTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="student1",
            password="password123"
        )
        self.other_user = User.objects.create_user(
            username="student2",
            password="password123"
        )
        self.note = Note.objects.create(
            user=self.other_user,
            title="Public Note",
            content="Study material",
            is_public=True
        )
        self.url = f"/notes/{self.note.note_id}/bookmark/"
        self.client.force_authenticate(user=self.user)

    def test_bookmark_public_note(self):
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertTrue(response.data["bookmarked"])
        self.assertTrue(
            Bookmark.objects.filter(user=self.user, note=self.note).exists()
        )

    def test_cannot_bookmark_same_note_twice(self):
        self.client.post(self.url)
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["bookmarked"])
        self.assertEqual(
            Bookmark.objects.filter(user=self.user, note=self.note).count(),
            1
        )

    def test_remove_bookmark(self):
        Bookmark.objects.create(user=self.user, note=self.note)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertFalse(response.data["bookmarked"])
        self.assertFalse(
            Bookmark.objects.filter(user=self.user, note=self.note).exists()
        )

    def test_remove_nonexistent_bookmark(self):
        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertFalse(response.data["bookmarked"])
        self.assertEqual(Bookmark.objects.count(), 0)

    def test_cannot_bookmark_private_note(self):
        self.note.is_public = False
        self.note.save()

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["success"])
        self.assertEqual(Bookmark.objects.count(), 0)

    def test_cannot_bookmark_own_note(self):
        own_note = Note.objects.create(
            user=self.user,
            title="My Note",
            content="My study material",
            is_public=True
        )

        response = self.client.post(
            f"/notes/{own_note.note_id}/bookmark/"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["success"])
        self.assertEqual(Bookmark.objects.count(), 0)

    def test_cannot_bookmark_nonexistent_note(self):
        response = self.client.post("/notes/99999/bookmark/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["success"])
        self.assertEqual(Bookmark.objects.count(), 0)

    def test_list_bookmarked_notes(self):
        Bookmark.objects.create(user=self.user, note=self.note)

        response = self.client.get("/bookmarks/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(len(response.data["notes"]), 1)
        self.assertEqual(
            response.data["notes"][0]["note_id"],
            self.note.note_id
        )
        self.assertTrue(response.data["notes"][0]["bookmarked"])

    def test_public_notes_show_bookmark_status(self):
        response = self.client.get("/notes/public/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["notes"][0]["bookmarked"])

        Bookmark.objects.create(user=self.user, note=self.note)

        response = self.client.get("/notes/public/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["notes"][0]["bookmarked"])

    def test_private_note_disappears_from_bookmarks(self):
        Bookmark.objects.create(user=self.user, note=self.note)

        self.note.is_public = False
        self.note.save()

        response = self.client.get("/bookmarks/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["notes"], [])
        self.assertTrue(
            Bookmark.objects.filter(user=self.user, note=self.note).exists()
        )

    def test_remove_bookmark_after_note_becomes_private(self):
        Bookmark.objects.create(user=self.user, note=self.note)

        self.note.is_public = False
        self.note.save()

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertFalse(response.data["bookmarked"])
        self.assertFalse(
            Bookmark.objects.filter(user=self.user, note=self.note).exists()
        )

    def test_bookmark_endpoints_require_authentication(self):
        self.client.force_authenticate(user=None)

        responses = [
            self.client.post(self.url),
            self.client.delete(self.url),
            self.client.get("/bookmarks/")
        ]

        for response in responses:
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED
            )

        self.assertEqual(Bookmark.objects.count(), 0)