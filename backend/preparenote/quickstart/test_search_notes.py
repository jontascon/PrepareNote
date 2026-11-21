from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from preparenote.exams.models import Exam, Section, Topic
from preparenote.quickstart.models import Note


class SearchMyNotesTests(APITestCase):
    """Covers searching and filtering your own notes for issue #21."""

    def setUp(self):
        self.user = get_user_model().objects.create_user("ritam", password="Testing987@")
        self.other = get_user_model().objects.create_user("tim", password="Testing987@")
        aws = Exam.objects.create(name="AWS")
        calc = Exam.objects.create(name="AP Calculus AB")
        networking = Section.objects.create(exam=aws, name="Networking")
        derivatives = Section.objects.create(exam=calc, name="Derivatives")
        self.vpc = Topic.objects.create(section=networking, name="VPC Peering")
        self.chain = Topic.objects.create(section=derivatives, name="Chain rule")

        self.peering = Note.objects.create(
            user=self.user, title="Peering", content="Peering is not transitive.",
            topic=self.vpc, study_status="reviewing", is_public=True,
        )
        self.chain_note = Note.objects.create(
            user=self.user, title="Chain rule", content="Multiply by the inside derivative.",
            topic=self.chain, study_status="confident",
        )
        self.loose = Note.objects.create(user=self.user, title="Loose note", content="No topic here.")
        Note.objects.create(user=self.other, title="Tim peering", content="Peering again.", topic=self.vpc, is_public=True)

        self.client.force_authenticate(user=self.user)

    def search(self, params):
        return self.client.get("/notes/", params)

    def titles(self, response):
        found = []
        for note in response.data["notes"]:
            found.append(note["title"])
        return found

    def test_no_filters_returns_all_my_notes(self):
        response = self.search({})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.titles(response), ["Peering", "Chain rule", "Loose note"])

    def test_search_matches_the_title_without_caring_about_case(self):
        response = self.search({"search": "PEERING"})

        self.assertEqual(self.titles(response), ["Peering"])

    def test_search_matches_the_note_text(self):
        response = self.search({"search": "inside derivative"})

        self.assertEqual(self.titles(response), ["Chain rule"])

    def test_search_never_returns_other_users_notes(self):
        response = self.search({"search": "peering"})

        self.assertNotIn("Tim peering", self.titles(response))

    def test_search_with_no_matches_returns_an_empty_list(self):
        response = self.search({"search": "kubernetes"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["notes"], [])

    def test_blank_search_is_ignored(self):
        response = self.search({"search": "   "})

        self.assertEqual(len(response.data["notes"]), 3)

    def test_search_of_200_characters_is_allowed(self):
        response = self.search({"search": "a" * 200})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_search_over_200_characters_is_rejected(self):
        response = self.search({"search": "a" * 201})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

    def test_search_text_is_not_run_as_sql(self):
        response = self.search({"search": "' OR 1=1 --"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["notes"], [])

    def test_filter_by_study_status(self):
        response = self.search({"study_status": "confident"})

        self.assertEqual(self.titles(response), ["Chain rule"])

    def test_unknown_study_status_is_rejected(self):
        response = self.search({"study_status": "mastered"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_by_exam(self):
        response = self.search({"exam_id": self.vpc.section.exam_id})

        self.assertEqual(self.titles(response), ["Peering"])

    def test_filter_by_topic(self):
        response = self.search({"topic_id": self.chain.id})

        self.assertEqual(self.titles(response), ["Chain rule"])

    def test_topic_that_is_not_a_number_is_rejected(self):
        response = self.search({"topic_id": "1 OR 1=1"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_exam_that_is_not_a_number_is_rejected(self):
        response = self.search({"exam_id": "-1"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_by_public_and_private(self):
        public = self.search({"visibility": "public"})
        private = self.search({"visibility": "private"})

        self.assertEqual(self.titles(public), ["Peering"])
        self.assertEqual(self.titles(private), ["Chain rule", "Loose note"])

    def test_unknown_visibility_is_rejected(self):
        response = self.search({"visibility": "everyone"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filters_can_be_combined(self):
        response = self.search({"search": "rule", "study_status": "confident", "exam_id": self.chain.section.exam_id})

        self.assertEqual(self.titles(response), ["Chain rule"])

    def test_combined_filters_that_do_not_match_return_nothing(self):
        response = self.search({"search": "rule", "visibility": "public"})

        self.assertEqual(response.data["notes"], [])

    def test_searching_requires_logging_in(self):
        self.client.force_authenticate(user=None)

        response = self.search({"search": "peering"})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SearchPublicNotesTests(APITestCase):
    """Covers searching public notes for issue #21."""

    def setUp(self):
        self.reader = get_user_model().objects.create_user("reader", password="Testing987@")
        self.writer = get_user_model().objects.create_user("writer", password="Testing987@")
        exam = Exam.objects.create(name="AWS")
        section = Section.objects.create(exam=exam, name="Networking")
        self.topic = Topic.objects.create(section=section, name="VPC Peering")
        self.exam = exam

        Note.objects.create(user=self.writer, title="Peering", content="Not transitive.", topic=self.topic, is_public=True)
        Note.objects.create(user=self.writer, title="Subnets", content="A /24 has 256 addresses.", is_public=True)
        Note.objects.create(user=self.writer, title="Secret peering", content="Private.", is_public=False)
        Note.objects.create(user=self.reader, title="My peering", content="Mine.", is_public=True)

        self.client.force_authenticate(user=self.reader)

    def search(self, params):
        return self.client.get("/notes/public/", params)

    def titles(self, response):
        found = []
        for note in response.data["notes"]:
            found.append(note["title"])
        return found

    def test_search_finds_public_notes_from_other_users(self):
        response = self.search({"search": "peering"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.titles(response), ["Peering"])

    def test_search_never_shows_private_notes(self):
        response = self.search({"search": "secret"})

        self.assertEqual(response.data["notes"], [])

    def test_filter_public_notes_by_exam(self):
        response = self.search({"exam_id": self.exam.id})

        self.assertEqual(self.titles(response), ["Peering"])

    def test_filter_public_notes_by_topic(self):
        response = self.search({"topic_id": self.topic.id})

        self.assertEqual(self.titles(response), ["Peering"])

    def test_bad_public_filter_is_rejected(self):
        response = self.search({"study_status": "unknown"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_filters_keeps_the_newest_first_order(self):
        response = self.search({})

        self.assertEqual(self.titles(response), ["Subnets", "Peering"])
