from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


class RegistrationTests(APITestCase):
    """Registration validation tests for issue #30."""

    def test_register_user_with_missing_required_fields(self):
        # PrpNt-TCID-02
        test_cases = [
            {"email": "dummyuser9998@yourdomain.com", "password": "Testing987@"},
            {"username": "dummyuser9999", "password": "Testing987@"},
            {"username": "dummyuser9999", "email": "dummyuser9999@yourdomain.com"},
        ]

        for data in test_cases:
            with self.subTest(data=data):
                response = self.client.post("/createUser/", data)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

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
