from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from preparenote.quickstart.models import Note


class ViewProfileTests(APITestCase):
    """Covers viewing your profile for issue #19."""

    def setUp(self):
        self.user = get_user_model().objects.create_user("ritam", email="ritam@example.com", password="Testing987@")
        Note.objects.create(user=self.user, title="Private", content="Only mine.")
        Note.objects.create(user=self.user, title="Shared", content="For everyone.", is_public=True)
        other = get_user_model().objects.create_user("tim", password="Testing987@")
        Note.objects.create(user=other, title="Tim's", content="Not mine.", is_public=True)

    def test_shows_my_profile_and_note_counts(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/profile/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        profile = response.data["profile"]
        self.assertEqual(profile["username"], "ritam")
        self.assertEqual(profile["email"], "ritam@example.com")
        self.assertFalse(profile["is_moderator"])
        self.assertEqual(profile["note_count"], 2)
        self.assertEqual(profile["public_note_count"], 1)
        self.assertEqual(profile["date_joined"], self.user.date_joined.date().isoformat())

    def test_moderators_are_marked_as_moderators(self):
        self.user.is_staff = True
        self.user.save()
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/profile/")

        self.assertTrue(response.data["profile"]["is_moderator"])

    def test_profile_never_includes_the_password(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/profile/")

        self.assertNotIn("password", response.data["profile"])

    def test_profile_requires_logging_in(self):
        response = self.client.get("/profile/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class EditProfileTests(APITestCase):
    """Covers editing your username and email for issue #19."""

    def setUp(self):
        self.user = get_user_model().objects.create_user("ritam", email="ritam@example.com", password="Testing987@")
        self.other = get_user_model().objects.create_user("tim", email="tim@example.com", password="Testing987@")
        self.client.force_authenticate(user=self.user)

    def edit(self, data):
        return self.client.put("/profile/", data, format="json")

    def test_updates_my_username_and_email(self):
        response = self.edit({"username": "ritam_r", "email": "new@example.com"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["profile"]["username"], "ritam_r")
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "ritam_r")
        self.assertEqual(self.user.email, "new@example.com")

    def test_keeping_my_own_username_is_allowed(self):
        response = self.edit({"username": "ritam", "email": "new@example.com"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_username_and_email_are_required(self):
        for data in ({"username": "", "email": "new@example.com"}, {"username": "ritam", "email": ""}, {}):
            with self.subTest(data=data):
                response = self.edit(data)

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertFalse(response.data["success"])
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "ritam@example.com")

    def test_username_taken_by_someone_else_is_rejected(self):
        response = self.edit({"username": "tim", "email": "new@example.com"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "A user with that username already exists.")
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "ritam")

    def test_username_of_150_characters_is_allowed(self):
        response = self.edit({"username": "a" * 150, "email": "new@example.com"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_username_over_150_characters_is_rejected(self):
        response = self.edit({"username": "a" * 151, "email": "new@example.com"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_username_with_bad_characters_is_rejected(self):
        response = self.edit({"username": "<script>", "email": "new@example.com"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bad_email_is_rejected(self):
        for email in ("not-an-email", "a@b", "@example.com"):
            with self.subTest(email=email):
                response = self.edit({"username": "ritam", "email": email})

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_edit_another_users_profile(self):
        response = self.edit({"id": self.other.id, "username": "hacked", "email": "hacked@example.com"})

        self.other.refresh_from_db()
        self.assertEqual(self.other.username, "tim")
        self.assertEqual(self.other.email, "tim@example.com")
        self.assertEqual(response.data["profile"]["id"], self.user.id)

    def test_cannot_make_myself_a_moderator(self):
        self.edit({"username": "ritam", "email": "ritam@example.com", "is_moderator": True, "is_staff": True})

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)

    def test_editing_requires_logging_in(self):
        self.client.force_authenticate(user=None)

        response = self.edit({"username": "hacked", "email": "hacked@example.com"})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ChangePasswordTests(APITestCase):
    """Covers changing your password for issue #19."""

    def setUp(self):
        self.user = get_user_model().objects.create_user("ritam", email="ritam@example.com", password="Testing987@")
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)

    def change(self, current_password, new_password):
        return self.client.post(
            "/profile/password/",
            {"current_password": current_password, "new_password": new_password},
            format="json",
        )

    def password_works(self, password):
        self.user.refresh_from_db()
        return self.user.check_password(password)

    def test_changes_the_password(self):
        response = self.change("Testing987@", "Better#Pass42")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertTrue(self.password_works("Better#Pass42"))
        self.assertFalse(self.password_works("Testing987@"))

    def test_can_log_in_with_the_new_password(self):
        self.change("Testing987@", "Better#Pass42")
        self.client.credentials()

        old = self.client.post("/getUser/", {"username": "ritam", "password": "Testing987@"})
        new = self.client.post("/getUser/", {"username": "ritam", "password": "Better#Pass42"})

        self.assertEqual(old.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(new.status_code, status.HTTP_200_OK)

    def test_changing_the_password_replaces_the_token(self):
        response = self.change("Testing987@", "Better#Pass42")

        self.assertNotEqual(response.data["token"], self.token.key)
        self.assertFalse(Token.objects.filter(key=self.token.key).exists())

        old_token = self.client.get("/notes/")
        self.client.credentials(HTTP_AUTHORIZATION="Token " + response.data["token"])
        new_token = self.client.get("/notes/")

        self.assertEqual(old_token.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(new_token.status_code, status.HTTP_200_OK)

    def test_wrong_current_password_is_rejected(self):
        response = self.change("wrong-password", "Better#Pass42")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Your current password is not correct.")
        self.assertTrue(self.password_works("Testing987@"))

    def test_both_passwords_are_required(self):
        for current, new in (("", "Better#Pass42"), ("Testing987@", ""), ("", "")):
            with self.subTest(current=current, new=new):
                response = self.change(current, new)

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(self.password_works("Testing987@"))

    def test_new_password_must_be_different(self):
        response = self.change("Testing987@", "Testing987@")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_of_7_characters_is_too_short(self):
        response = self.change("Testing987@", "Zq8#mW2")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(self.password_works("Testing987@"))

    def test_password_of_8_characters_is_allowed(self):
        response = self.change("Testing987@", "Zq8#mW2p")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_common_password_is_rejected(self):
        response = self.change("Testing987@", "password123")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_numbers_only_password_is_rejected(self):
        response = self.change("Testing987@", "83917465")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_changing_the_password_requires_logging_in(self):
        self.client.credentials()

        response = self.change("Testing987@", "Better#Pass42")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(self.password_works("Testing987@"))
