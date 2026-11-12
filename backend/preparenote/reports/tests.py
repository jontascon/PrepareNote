from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from preparenote.quickstart.models import Note

from .models import Report


class ReportPublicNoteTests(APITestCase):
    """Covers the acceptance criteria for issue #22."""

    def setUp(self):
        self.owner = get_user_model().objects.create_user("owner", password="Testing987@")
        self.reader = get_user_model().objects.create_user("reader", password="Testing987@")
        self.public_note = Note.objects.create(user=self.owner, title="Shared", content="For everyone.", is_public=True)
        self.private_note = Note.objects.create(user=self.owner, title="Mine", content="Only for me.")

    def report(self, note_id, reason):
        return self.client.post(f"/notes/{note_id}/report/", {"reason": reason}, format="json")

    def test_report_a_public_note(self):
        self.client.force_authenticate(user=self.reader)

        response = self.report(self.public_note.note_id, "This is copied from a paid course.")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        report = Report.objects.get()
        self.assertEqual(report.note, self.public_note)
        self.assertEqual(report.reporter, self.reader)
        self.assertEqual(report.reason, "This is copied from a paid course.")
        self.assertEqual(response.data["report"]["note_id"], self.public_note.note_id)

    def test_reason_is_required(self):
        self.client.force_authenticate(user=self.reader)

        missing = self.client.post(f"/notes/{self.public_note.note_id}/report/", {}, format="json")
        blank = self.report(self.public_note.note_id, "   ")

        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(blank.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(blank.data["error"], "Please give a reason for the report.")
        self.assertEqual(Report.objects.count(), 0)

    def test_reason_length_boundaries(self):
        self.client.force_authenticate(user=self.reader)

        too_long = self.report(self.public_note.note_id, "a" * 501)
        self.assertEqual(too_long.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Report.objects.count(), 0)

        longest = self.report(self.public_note.note_id, "a" * 500)
        self.assertEqual(longest.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(Report.objects.get().reason), 500)

    def test_reason_is_trimmed(self):
        self.client.force_authenticate(user=self.reader)

        self.report(self.public_note.note_id, "  Wrong answer for question 3.  ")

        self.assertEqual(Report.objects.get().reason, "Wrong answer for question 3.")

    def test_cannot_report_the_same_note_twice(self):
        self.client.force_authenticate(user=self.reader)
        self.report(self.public_note.note_id, "Spam.")

        response = self.report(self.public_note.note_id, "Still spam.")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "You already reported this note.")
        self.assertEqual(Report.objects.count(), 1)

    def test_different_users_can_report_the_same_note(self):
        third = get_user_model().objects.create_user("third", password="Testing987@")

        self.client.force_authenticate(user=self.reader)
        first = self.report(self.public_note.note_id, "Spam.")
        self.client.force_authenticate(user=third)
        second = self.report(self.public_note.note_id, "Off topic.")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.public_note.reports.count(), 2)

    def test_cannot_report_your_own_note(self):
        self.client.force_authenticate(user=self.owner)

        response = self.report(self.public_note.note_id, "Testing.")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Report.objects.count(), 0)

    def test_cannot_report_a_private_note(self):
        self.client.force_authenticate(user=self.reader)

        response = self.report(self.private_note.note_id, "Spam.")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Report.objects.count(), 0)

    def test_cannot_report_a_note_that_does_not_exist(self):
        self.client.force_authenticate(user=self.reader)

        response = self.report(9999, "Spam.")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_must_be_logged_in_to_report(self):
        response = self.report(self.public_note.note_id, "Spam.")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Report.objects.count(), 0)

    def test_reporting_does_not_change_or_hide_the_note(self):
        self.client.force_authenticate(user=self.reader)

        self.report(self.public_note.note_id, "Spam.")

        self.public_note.refresh_from_db()
        self.assertEqual(self.public_note.title, "Shared")
        self.assertTrue(self.public_note.is_public)

    """def test_only_post_is_allowed(self):
        self.client.force_authenticate(user=self.reader)

        response = self.client.get(f"/notes/{self.public_note.note_id}/report/")

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)""" # Commented this section because GET on this endpoint now retrieves the user's report

    def test_reports_are_removed_when_the_note_is_deleted(self):
        self.client.force_authenticate(user=self.reader)
        self.report(self.public_note.note_id, "Spam.")

        self.client.force_authenticate(user=self.owner)
        self.client.delete(f"/notes/{self.public_note.note_id}/")

        self.assertEqual(Report.objects.count(), 0)

    def test_public_notes_list_shows_which_notes_you_reported(self):
        other_note = Note.objects.create(user=self.owner, title="Other", content="Fine.", is_public=True)
        self.client.force_authenticate(user=self.reader)
        self.report(self.public_note.note_id, "Spam.")

        response = self.client.get("/notes/public/")

        reported = {note["note_id"]: note["reported"] for note in response.data["notes"]}
        self.assertEqual(reported, {self.public_note.note_id: True, other_note.note_id: False})

    def test_another_users_report_does_not_mark_the_note_for_you(self):
        third = get_user_model().objects.create_user("third", password="Testing987@")
        self.client.force_authenticate(user=third)
        self.report(self.public_note.note_id, "Spam.")

        self.client.force_authenticate(user=self.reader)
        response = self.client.get("/notes/public/")

        self.assertFalse(response.data["notes"][0]["reported"])

class ReviewAndRemoveReports(APITestCase):
    """Covers the acceptance criteria for issue #23."""

    def setUp(self):
        self.note_owner = get_user_model().objects.create_user("note_owner", password="Testing")
        self.public_user = get_user_model().objects.create_user("public_user", password="Testing")
        self.public_user2 = get_user_model().objects.create_user("public_user2", password="Testing")
        self.mod_user = get_user_model().objects.create_user("mod_user", password="Testing", is_staff=True)
        self.public_note = Note.objects.create(user=self.note_owner, title="Shared", content="For everyone.", is_public=True)
        self.private_note = Note.objects.create(user=self.note_owner, title="Mine", content="Only for me.")

    def getReport(self, note_id):
        return self.client.get(f"/notes/{note_id}/report/")

    def listReports(self, note_id):
        return self.client.get(f"/notes/{note_id}/reports/")

    def removeReport(self, note_id, reporter_id=None):
        if reporter_id:
            return self.client.post(f"/notes/{note_id}/removeReport/{reporter_id}")

        return self.client.post(f"/notes/{note_id}/removeReport")

    def test_get_report_fail(self):
        self.client.force_authenticate(user=self.public_user)

        # Failed attempt
        response = self.getReport(self.public_note.note_id)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["success"])

    def test_get_report_success(self):
        self.client.force_authenticate(user=self.public_user)

        # Successful attempt
        report = Report.objects.create(reporter=self.public_user, note=self.public_note)

        response = self.getReport(self.public_note.note_id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

    def test_unauthorized_list_reports(self):
        self.client.force_authenticate(user=self.public_user)
        report = Report.objects.create(reporter=self.public_user, note=self.public_note)

        response = self.listReports(self.public_note.note_id)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])

    def test_authorized_list_reports(self):
        self.client.force_authenticate(user=self.mod_user)

        # Create report and test
        report = Report.objects.create(reporter=self.public_user, note=self.public_note)

        response = self.listReports(self.public_note.note_id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(len(response.data["reports"]), 1)

        # Create secondary report
        report = Report.objects.create(reporter=self.public_user2, note=self.public_note)

        response = self.listReports(self.public_note.note_id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(len(response.data["reports"]), 2)