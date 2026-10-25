from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


class RegistrationTests(APITestCase):
    """Basic registration tests for issue #10."""

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
