from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from preparenote.quickstart.models import FavoriteContributor, Note


class FavoriteContributorTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="student1",
            password="password123"
        )
        self.contributor = User.objects.create_user(
            username="student2",
            password="password123"
        )
        self.note = Note.objects.create(
            user=self.contributor,
            title="Public Note",
            content="Study material",
            is_public=True
        )
        self.favorite_url = (
            f"/contributors/{self.contributor.id}/favorite/"
        )
        self.notes_url = (
            f"/contributors/{self.contributor.id}/notes/"
        )
        self.client.force_authenticate(user=self.user)

    def test_add_favorite_contributor(self):
        response = self.client.post(self.favorite_url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertTrue(response.data["favorited"])
        self.assertTrue(
            FavoriteContributor.objects.filter(
                user=self.user,
                contributor=self.contributor
            ).exists()
        )

    def test_remove_favorite_contributor(self):
        FavoriteContributor.objects.create(
            user=self.user,
            contributor=self.contributor
        )

        response = self.client.delete(self.favorite_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertFalse(response.data["favorited"])
        self.assertFalse(
            FavoriteContributor.objects.filter(
                user=self.user,
                contributor=self.contributor
            ).exists()
        )

    def test_duplicate_favorite_contributor(self):
        self.client.post(self.favorite_url)

        response = self.client.post(self.favorite_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertTrue(response.data["favorited"])
        self.assertEqual(
            FavoriteContributor.objects.filter(
                user=self.user,
                contributor=self.contributor
            ).count(),
            1
        )

    def test_list_favorite_contributors(self):
        FavoriteContributor.objects.create(
            user=self.user,
            contributor=self.contributor
        )

        response = self.client.get("/contributors/favorites/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(len(response.data["contributors"]), 1)
        self.assertEqual(
            response.data["contributors"][0]["id"],
            self.contributor.id
        )
        self.assertEqual(
            response.data["contributors"][0]["username"],
            self.contributor.username
        )
    
    def test_get_contributor_public_notes(self):
        response = self.client.get(self.notes_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(
            response.data["contributor"]["id"],
            self.contributor.id
        )
        self.assertEqual(len(response.data["notes"]), 1)
        self.assertEqual(
            response.data["notes"][0]["note_id"],
            self.note.note_id
        )

    def test_contributor_private_notes_are_hidden(self):
        private_note = Note.objects.create(
            user=self.contributor,
            title="Private Note",
            content="Confidential study material",
            is_public=False
        )

        response = self.client.get(self.notes_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(len(response.data["notes"]), 1)

        returned_note_ids = [
            note["note_id"] for note in response.data["notes"]
        ]

        self.assertIn(self.note.note_id, returned_note_ids)
        self.assertNotIn(private_note.note_id, returned_note_ids)

    def test_favorite_nonexistent_contributor(self):
        response = self.client.post("/contributors/999999/favorite/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["success"])

    def test_notes_nonexistent_contributor(self):
        response = self.client.get("/contributors/999999/notes/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["success"])

    def test_cannot_favorite_self(self):
        response = self.client.post(
            f"/contributors/{self.user.id}/favorite/"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertFalse(
            FavoriteContributor.objects.filter(
                user=self.user,
                contributor=self.user
            ).exists()
        )

    def test_authentication_required(self):
        self.client.force_authenticate(user=None)

        responses = [
            self.client.get("/contributors/favorites/"),
            self.client.post(self.favorite_url),
            self.client.delete(self.favorite_url),
            self.client.get(self.notes_url),
        ]

        for response in responses:
            self.assertIn(
                response.status_code,
                [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
            )