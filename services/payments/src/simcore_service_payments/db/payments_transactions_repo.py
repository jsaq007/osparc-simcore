import datetime
from decimal import Decimal

import sqlalchemy as sa
from models_library.api_schemas_webserver.wallets import PaymentID
from models_library.users import UserID
from models_library.wallets import WalletID
from pydantic import HttpUrl, PositiveInt, parse_obj_as
from simcore_postgres_database import errors as pg_errors
from simcore_postgres_database.models.payments_transactions import (
    PaymentTransactionState,
    payments_transactions,
)
from sqlalchemy.ext.asyncio import AsyncEngine

from ..core.errors import (
    PaymentAlreadyAckedError,
    PaymentAlreadyExistsError,
    PaymentNotFoundError,
)
from ..models.db import PaymentsTransactionsDB


class BaseRepository:
    """
    Repositories are pulled at every request
    """

    def __init__(self, db_engine: AsyncEngine):
        assert db_engine is not None  # nosec
        self.db_engine = db_engine


class PaymentsTransactionsRepo(BaseRepository):
    async def insert_init_payment_transaction(
        self,
        payment_id: PaymentID,
        price_dollars: Decimal,
        osparc_credits: Decimal,
        product_name: str,
        user_id: UserID,
        user_email: str,
        wallet_id: WalletID,
        comment: str | None,
        initiated_at: datetime.datetime,
    ) -> PaymentID:
        """Annotates init-payment transaction
        Raises:
            PaymentAlreadyExistsError
        """

        try:
            async with self.db_engine.begin() as conn:
                await conn.execute(
                    payments_transactions.insert().values(
                        payment_id=f"{payment_id}",
                        price_dollars=price_dollars,
                        osparc_credits=osparc_credits,
                        product_name=product_name,
                        user_id=user_id,
                        user_email=user_email,
                        wallet_id=wallet_id,
                        comment=comment,
                        initiated_at=initiated_at,
                    )
                )
                return payment_id
        except pg_errors.UniqueViolation as exc:
            raise PaymentAlreadyExistsError(payment_id=f"{payment_id}") from exc

    async def update_ack_payment_transaction(
        self,
        payment_id: PaymentID,
        completion_state: PaymentTransactionState,
        state_message: str | None,
        invoice_url: HttpUrl | None,
    ) -> PaymentsTransactionsDB:
        """
        - ACKs payment by updating state with SUCCESS, CANCEL, etc

        Raises:
            ValueError
            PaymentNotFoundError
            PaymentAlreadyAckedError

        """

        if completion_state == PaymentTransactionState.PENDING:
            msg = f"cannot update state with {completion_state=} since it is already initiated"
            raise ValueError(msg)

        optional = {}
        if state_message:
            optional["state_message"] = state_message

        async with self.db_engine.begin() as connection:
            row = (
                await connection.execute(
                    sa.select(
                        payments_transactions.c.initiated_at,
                        payments_transactions.c.completed_at,
                    )
                    .where(payments_transactions.c.payment_id == f"{payment_id}")
                    .with_for_update()
                )
            ).fetchone()

            if row is None:
                raise PaymentNotFoundError(payment_id=f"{payment_id}")

            if row.completed_at is not None:
                assert row.initiated_at < row.completed_at  # nosec
                raise PaymentAlreadyAckedError(payment_id=f"{payment_id}")

            assert row.initiated_at  # nosec

            result = await connection.execute(
                payments_transactions.update()
                .values(
                    completed_at=sa.func.now(),
                    state=completion_state,
                    invoice_url=invoice_url,
                    **optional,
                )
                .where(payments_transactions.c.payment_id == f"{payment_id}")
                .returning(sa.literal_column("*"))
            )
            row = result.first()
            assert row, "execute above should have caught this"  # nosec

            return PaymentsTransactionsDB.from_orm(row)

    async def list_user_payment_transactions(
        self,
        user_id: UserID,
        *,
        offset: PositiveInt | None = None,
        limit: PositiveInt | None = None,
    ) -> tuple[int, list[PaymentsTransactionsDB]]:
        """List payments done by a give user (any wallet)

        Sorted by newest-first
        """
        async with self.db_engine.begin() as connection:
            result = await connection.execute(
                sa.select(sa.func.count())
                .select_from(payments_transactions)
                .where(payments_transactions.c.user_id == user_id)
            )
            total_number_of_items = result.scalar()
            assert total_number_of_items is not None  # nosec

            # NOTE: what if between these two calls there are new rows? can we get this in an atomic call?å
            stmt = (
                payments_transactions.select()
                .where(payments_transactions.c.user_id == user_id)
                .order_by(payments_transactions.c.created.desc())
            )  # newest first

            if offset is not None:
                # psycopg2.errors.InvalidRowCountInResultOffsetClause: OFFSET must not be negative
                stmt = stmt.offset(offset)

            if limit is not None:
                # InvalidRowCountInLimitClause: LIMIT must not be negative
                stmt = stmt.limit(limit)

            result = await connection.execute(stmt)
            rows = result.fetchall()
            return total_number_of_items, parse_obj_as(
                list[PaymentsTransactionsDB], rows
            )

    async def get_payment_transaction(
        self, payment_id: PaymentID, user_id: UserID, wallet_id: WalletID
    ) -> PaymentsTransactionsDB | None:
        # NOTE: user access and rights are expected to be checked at this point
        # nonetheless, `user_id` and `wallet_id` are added here for caution
        async with self.db_engine.begin() as connection:
            result = await connection.execute(
                payments_transactions.select().where(
                    (payments_transactions.c.payment_id == f"{payment_id}")
                    & (payments_transactions.c.user_id == user_id)
                    & (payments_transactions.c.wallet_id == wallet_id)
                )
            )
            row = result.fetchone()
            return PaymentsTransactionsDB.from_orm(row) if row else None
