"""Tests for authentication endpoints."""

import pytest
import pytest_asyncio
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Test user registration."""
    response = await client.post("/api/v1/auth/register", json={
        "email": "newuser@test.ro",
        "password": "SecurePass123!",
        "full_name": "New User",
        "phone": "+40721999999",
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Test that registering with duplicate email fails."""
    user_data = {
        "email": "duplicate@test.ro",
        "password": "SecurePass123!",
        "full_name": "User One",
    }
    response1 = await client.post("/api/v1/auth/register", json=user_data)
    assert response1.status_code == 201

    response2 = await client.post("/api/v1/auth/register", json={
        **user_data,
        "full_name": "User Two",
    })
    assert response2.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test successful login."""
    # Register first
    await client.post("/api/v1/auth/register", json={
        "email": "logintest@test.ro",
        "password": "SecurePass123!",
        "full_name": "Login Test",
    })

    response = await client.post("/api/v1/auth/login", json={
        "email": "logintest@test.ro",
        "password": "SecurePass123!",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Test login with wrong password."""
    await client.post("/api/v1/auth/register", json={
        "email": "wrongpass@test.ro",
        "password": "SecurePass123!",
        "full_name": "Wrong Pass",
    })

    response = await client.post("/api/v1/auth/login", json={
        "email": "wrongpass@test.ro",
        "password": "WrongPassword!",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_endpoint(client: AsyncClient, test_user):
    """Test /me endpoint with valid token."""
    response = await client.get("/api/v1/auth/me", headers=test_user["headers"])
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@salonelegance.ro"
    assert data["full_name"] == "Test User"


@pytest.mark.asyncio
async def test_me_endpoint_no_auth(client: AsyncClient):
    """Test /me endpoint without token."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
