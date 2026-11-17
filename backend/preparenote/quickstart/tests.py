from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Note
from rest_framework.authtoken.models import Token


class RegistrationTests(APITestCase):
    """Registration tests for PrepareNote."""

    def test_register_user_with_missing_required_fields(self):
        # PrpNt-TCID-02
        valid_data = {
            "username": "dummyuser9999",
            "email": "dummyuser9998@yourdomain.com",
            "password": "Testing987@",
        }

        for field in valid_data:
            for missing in (True, False):
                with self.subTest(field=field, missing=missing):
                    data = valid_data.copy()

                    if missing:
                        del data[field]
                    else:
                        data[field] = ""

                    response = self.client.post("/createUser/", data)

                    self.assertEqual(
                        response.status_code,
                        status.HTTP_400_BAD_REQUEST,
                    )
                    self.assertFalse(response.data["success"])
                    self.assertTrue(response.data["error"])
                    self.assertEqual(get_user_model().objects.count(), 0)

    def test_register_user_with_duplicate_username(self):
        # PrpNt-TCID-03
        get_user_model().objects.create_user(
            username="dummyuser9999",
            email="dummyuser9999@yourdomain.com",
            password="Testing987@",
        )

        response = self.client.post("/createUser/", {
            "username": "dummyuser9999",
            "email": "duplicate@yourdomain.com",
            "password": "Testing987@",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(get_user_model().objects.count(), 1)
        self.assertEqual(
            get_user_model().objects.get(username="dummyuser9999").email,
            "dummyuser9999@yourdomain.com",
        )

    def test_register_user_with_valid_information(self):
        # PrpNt-TCID-01
        response = self.client.post("/createUser/", {
            "username": "dummyuser9999",
            "email": "dummyuser9999@yourdomain.com",
            "password": "Testing987@",
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertTrue(
            get_user_model().objects.filter(username="dummyuser9999").exists()
        )

    def test_register_user_with_username_length_boundaries(self):
        # PrpNt-TCID-36
        test_cases = [
            (150, status.HTTP_201_CREATED),
            (151, status.HTTP_400_BAD_REQUEST),
        ]

        for length, expected_status in test_cases:
            with self.subTest(length=length):
                response = self.client.post("/createUser/", {
                    "username": "a" * length,
                    "email": "boundary@yourdomain.com",
                    "password": "Testing987@",
                })

                self.assertEqual(response.status_code, expected_status)
                self.assertEqual(response.data["success"], length == 150)

                if length == 151:
                    self.assertTrue(response.data["error"])

        self.assertEqual(get_user_model().objects.count(), 1)
        self.assertTrue(get_user_model().objects.filter(username="a" * 150).exists())

class LoginTests(APITestCase):
    """Login tests for PrepareNote."""

    def setUp(self):
        get_user_model().objects.create_user(
            username="dummyuser9999",
            email="dummyuser9999@yourdomain.com",
            password="Testing987@",
        )

    def test_login_with_valid_credentials(self):
        # PrpNt-TCID-04
        response = self.client.post("/getUser/", {
            "username": "dummyuser9999",
            "password": "Testing987@",
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["username"], "dummyuser9999")
        self.assertTrue(response.data["token"])

    def test_login_with_invalid_credentials(self):
        # PrpNt-TCID-05
        response = self.client.post("/getUser/", {
            "username": "dummyuser9999",
            "password": "Wrong987@",
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])

    def test_logout_invalidates_token_and_blocks_note_access(self):
        # PrpNt-TCID-06
        response = self.client.post("/getUser/", {
            "username": "dummyuser9999",
            "password": "Testing987@",
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        token = response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        response = self.client.get("/notes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.post("/logout/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertFalse(Token.objects.filter(key=token).exists())

        response = self.client.get("/notes/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.credentials()
        response = self.client.get("/notes/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reject_user_information_without_password(self):
        # PrpNt-TCID-35
        get_user_model().objects.create_user(
            username="dummyuser9998",
            password="Testing987@",
        )

        response = self.client.post("/getUser/", {
            "username": "dummyuser9999",
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])

        for field in ("username", "email", "id", "token", "is_moderator"):
            with self.subTest(field=field):
                self.assertNotIn(field, response.data)

        self.assertFalse(Token.objects.exists())

class NoteTests(APITestCase):
    """Note CRUD and access control tests for PrepareNote."""

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="dummyuser9999",
            email="dummyuser9999@yourdomain.com",
            password="Testing987@",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_note(self):
        # PrpNt-TCID-10
        response = self.client.post("/notes/", {
            "title": "IP Addresses",
            "content": "IPv4 uses 32-bit addresses.",
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Note.objects.filter(
                user=self.user,
                title="IP Addresses",
                content="IPv4 uses 32-bit addresses.",
            ).exists()
        )

    def test_reject_note_with_missing_required_fields(self):
        # PrpNt-TCID-14
        test_cases = [
            {"title": "", "content": "Test note"},
            {"title": "Test note", "content": ""},
        ]

        for data in test_cases:
            with self.subTest(data=data):
                response = self.client.post("/notes/", data)

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertFalse(response.data["success"])
                self.assertTrue(response.data["error"])

        self.assertEqual(Note.objects.count(), 0)

    def test_retrieve_notes(self):
        # PrpNt-TCID-11
        note = Note.objects.create(
            user=self.user,
            title="IP Addresses",
            content="IPv4 uses 32-bit addresses.",
        )

        response = self.client.get("/notes/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["notes"]), 1)
        self.assertEqual(response.data["notes"][0]["note_id"], note.note_id)
        self.assertEqual(response.data["notes"][0]["title"], "IP Addresses")
        self.assertEqual(
            response.data["notes"][0]["content"],
            "IPv4 uses 32-bit addresses.",
        )

    def test_update_note(self):
        # PrpNt-TCID-12
        note = Note.objects.create(
            user=self.user,
            title="IP Addresses",
            content="IPv4 uses 32-bit addresses.",
        )

        response = self.client.put(f"/notes/{note.note_id}/", {
            "title": "IP Addresses",
            "content": "IPv6 uses 128-bit addresses.",
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note.refresh_from_db()
        self.assertEqual(note.title, "IP Addresses")
        self.assertEqual(note.content, "IPv6 uses 128-bit addresses.")

        response = self.client.get(f"/notes/{note.note_id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["note"]["title"], "IP Addresses")
        self.assertEqual(
            response.data["note"]["content"],
            "IPv6 uses 128-bit addresses.",
        )

    def test_delete_note(self):
        # PrpNt-TCID-13
        note = Note.objects.create(
            user=self.user,
            title="IP Addresses",
            content="IPv4 uses 32-bit addresses.",
        )

        response = self.client.delete(f"/notes/{note.note_id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Note.objects.filter(note_id=note.note_id).exists())

        response = self.client.get(f"/notes/{note.note_id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reject_unauthenticated_note_access(self):
        # PrpNt-TCID-43
        self.client.force_authenticate(user=None)

        response = self.client.get("/notes/")

        self.assertIn(response.status_code,[status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_reject_access_to_another_users_note(self):
        # PrpNt-TCID-22
        note = Note.objects.create(
            user=self.user,
            title="Private Note",
            content="Private note",
        )
        other_user = get_user_model().objects.create_user(
            username="dummyuser9998",
            password="Testing987@",
        )
        self.client.force_authenticate(user=other_user)

        response = self.client.get(f"/notes/{note.note_id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertNotIn("note", response.data)
        note.refresh_from_db()
        self.assertEqual(note.user_id, self.user.pk)

    def test_reject_changes_to_another_users_note(self):
        # PrpNt-TCID-15
        note = Note.objects.create(
            user=self.user,
            title="Private Note",
            content="Private note",
        )
        other_user = get_user_model().objects.create_user(
            username="dummyuser9998",
            password="Testing987@",
        )
        self.client.force_authenticate(user=other_user)

        response = self.client.put(f"/notes/{note.note_id}/", {
            "title": "Changed title",
            "content": "Changed content",
        })

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        note.refresh_from_db()
        self.assertEqual(note.title, "Private Note")
        self.assertEqual(note.content, "Private note")
        self.assertEqual(note.user_id, self.user.pk)

        response = self.client.delete(f"/notes/{note.note_id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        note.refresh_from_db()
        self.assertEqual(note.title, "Private Note")
        self.assertEqual(note.content, "Private note")
        self.assertEqual(note.user_id, self.user.pk)
