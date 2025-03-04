# pylint: disable=protected-access
# pylint: disable=redefined-outer-name
# pylint: disable=too-many-arguments
# pylint: disable=unused-argument
# pylint: disable=unused-variable


from unittest.mock import MagicMock

import pytest
from aiohttp import ClientResponseError, web
from aiohttp.test_utils import TestClient
from faker import Faker
from pytest_mock import MockerFixture
from pytest_simcore.helpers.utils_assert import assert_status
from pytest_simcore.helpers.utils_login import NewUser, UserInfoDict
from servicelib.aiohttp import status
from simcore_postgres_database.models.users import UserRole
from simcore_service_webserver.login._constants import MSG_USER_DELETED
from simcore_service_webserver.products.api import get_product


@pytest.mark.parametrize(
    "user_role", [role for role in UserRole if role < UserRole.USER]
)
async def test_unregister_account_access_rights(
    client: TestClient, logged_user: UserInfoDict, mocker: MockerFixture
):
    response = await client.post(
        "/v0/auth/unregister",
        json={
            "email": logged_user["email"],
            "password": logged_user["raw_password"],
        },
    )

    with pytest.raises(ClientResponseError) as err_info:
        response.raise_for_status()

    error = err_info.value
    assert error.status in (
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    ), f"{error}"


@pytest.fixture
def mocked_send_email(mocker: MockerFixture) -> MagicMock:
    # OVERRIDES services/web/server/tests/unit/with_dbs/conftest.py:mocked_send_email fixture
    return mocker.patch(
        "simcore_service_webserver.email._core._do_send_mail",
        spec=True,
    )


@pytest.mark.parametrize(
    "user_role", [role for role in UserRole if role >= UserRole.USER]
)
async def test_unregister_account(
    client: TestClient, logged_user: UserInfoDict, mocked_send_email: MagicMock
):
    assert client.app

    # is logged in
    response = await client.get("/v0/me")
    await assert_status(response, web.HTTPOk)

    # success to request deletion of account
    response = await client.post(
        "/v0/auth/unregister",
        json={
            "email": logged_user["email"],
            "password": logged_user["raw_password"],
        },
    )
    await assert_status(response, web.HTTPOk)

    # sent email?
    mimetext = mocked_send_email.call_args[1]["message"]
    assert mimetext["Subject"]
    assert mimetext["To"] == logged_user["email"]

    # should be logged-out
    response = await client.get("/v0/me")
    await assert_status(response, web.HTTPUnauthorized)

    # try to login again and get rejected
    response = await client.post(
        "/v0/auth/login",
        json={"email": logged_user["email"], "password": logged_user["raw_password"]},
    )
    _, error = await assert_status(response, web.HTTPUnauthorized)

    prefix_msg = MSG_USER_DELETED.format(support_email="").strip()
    assert prefix_msg in error["errors"][0]["message"]


@pytest.mark.parametrize(
    "user_role", [role for role in UserRole if role >= UserRole.USER]
)
async def test_cannot_unregister_other_account(
    client: TestClient, logged_user: UserInfoDict, mocked_send_email: MagicMock
):
    assert client.app

    # is logged in
    response = await client.get("/v0/me")
    await assert_status(response, web.HTTPOk)

    # cannot delete another account
    async with NewUser(app=client.app) as other_user:
        response = await client.post(
            "/v0/auth/unregister",
            json={
                "email": other_user["email"],
                "password": other_user["raw_password"],
            },
        )
        await assert_status(response, web.HTTPConflict)


@pytest.mark.parametrize("invalidate", ["email", "raw_password"])
@pytest.mark.parametrize(
    "user_role", [role for role in UserRole if role >= UserRole.USER]
)
async def test_cannot_unregister_invalid_credentials(
    client: TestClient,
    logged_user: UserInfoDict,
    mocked_send_email: MagicMock,
    invalidate: str,
):
    assert client.app

    # check is logged in
    response = await client.get("/v0/me")
    await assert_status(response, web.HTTPOk)

    # check cannot invalid credentials
    credentials = {k: logged_user[k] for k in ("email", "raw_password")}
    credentials[invalidate] += "error"

    response = await client.post(
        "/v0/auth/unregister",
        json={
            "email": credentials["email"],
            "password": credentials["raw_password"],
        },
    )
    await assert_status(response, web.HTTPConflict)


async def test_request_an_account(
    client: TestClient, faker: Faker, mocked_send_email: MagicMock
):
    assert client.app

    response = await client.post(
        "/v0/auth/request-account",
        json={
            "form": {
                "first_name": faker.first_name(),
                "last_name": faker.last_name(),
                "email": faker.email(),
            }
        },
    )

    await assert_status(response, web.HTTPNoContent)

    product = get_product(client.app, product_name="osparc")

    # sent email?
    mimetext = mocked_send_email.call_args[1]["message"]
    assert "account" in mimetext["Subject"]
    assert mimetext["From"] == product.support_email
    assert mimetext["To"] == product.support_email
