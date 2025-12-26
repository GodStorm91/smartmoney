"""add crypto wallet tracking tables

Revision ID: add_crypto_wallet_tables
Revises: add_transfer_fields
Create Date: 2025-12-26 16:34:00

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_crypto_wallet_tables'
down_revision: Union[str, None] = 'add_transfer_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    """Check if a table exists in the database."""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'

    # Create crypto_wallets table
    if not table_exists('crypto_wallets'):
        op.create_table(
            'crypto_wallets',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('wallet_address', sa.String(42), nullable=False),
            sa.Column('label', sa.String(100), nullable=True),
            sa.Column('chains', sa.JSON(), nullable=False, server_default='["eth", "bsc", "polygon"]'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        )
        op.create_index('ix_crypto_wallets_user_id', 'crypto_wallets', ['user_id'])
        op.create_index('ix_crypto_wallets_address', 'crypto_wallets', ['wallet_address'])

    # Create reward_contracts table
    if not table_exists('reward_contracts'):
        op.create_table(
            'reward_contracts',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('chain_id', sa.String(20), nullable=False),
            sa.Column('contract_address', sa.String(42), nullable=False),
            sa.Column('label', sa.String(100), nullable=True),
            sa.Column('token_symbol', sa.String(20), nullable=True),
            sa.Column('token_decimals', sa.Integer(), nullable=False, server_default='18'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        )
        op.create_index('ix_reward_contracts_user_id', 'reward_contracts', ['user_id'])
        op.create_index('ix_reward_contracts_chain_address', 'reward_contracts', ['chain_id', 'contract_address'])

    # Create crypto_sync_state table
    if not table_exists('crypto_sync_state'):
        op.create_table(
            'crypto_sync_state',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('wallet_id', sa.Integer(), nullable=False),
            sa.Column('wallet_address', sa.String(42), nullable=False),
            sa.Column('chain_id', sa.String(20), nullable=False),
            sa.Column('last_sync_at', sa.DateTime(), nullable=True),
            sa.Column('last_block_number', sa.BigInteger(), nullable=True),
            sa.Column('last_balance_usd', sa.Numeric(20, 2), nullable=True),
            sa.Column('sync_status', sa.String(20), nullable=False, server_default='pending'),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['wallet_id'], ['crypto_wallets.id'], ondelete='CASCADE'),
        )
        op.create_index('ix_crypto_sync_state_user_wallet_chain', 'crypto_sync_state', ['user_id', 'wallet_address', 'chain_id'], unique=True)

    # Create reward_claims table
    if not table_exists('reward_claims'):
        op.create_table(
            'reward_claims',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('wallet_address', sa.String(42), nullable=False),
            sa.Column('chain_id', sa.String(20), nullable=False),
            sa.Column('tx_hash', sa.String(66), nullable=False),
            sa.Column('from_contract', sa.String(42), nullable=False),
            sa.Column('token_address', sa.String(42), nullable=True),
            sa.Column('token_symbol', sa.String(20), nullable=True),
            sa.Column('token_amount', sa.Numeric(30, 18), nullable=True),
            sa.Column('fiat_value', sa.Numeric(20, 2), nullable=True),
            sa.Column('fiat_currency', sa.String(3), nullable=False, server_default='USD'),
            sa.Column('token_price', sa.Numeric(20, 8), nullable=True),
            sa.Column('block_number', sa.BigInteger(), nullable=True),
            sa.Column('block_timestamp', sa.DateTime(), nullable=True),
            sa.Column('transaction_id', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='SET NULL'),
        )
        op.create_index('ix_reward_claims_tx_hash_chain', 'reward_claims', ['tx_hash', 'chain_id'], unique=True)
        op.create_index('ix_reward_claims_user_id', 'reward_claims', ['user_id'])

    # Add crypto_wallet_id to accounts table
    if not column_exists('accounts', 'crypto_wallet_id'):
        op.add_column('accounts', sa.Column('crypto_wallet_id', sa.Integer(), nullable=True))
    if not column_exists('accounts', 'account_subtype'):
        op.add_column('accounts', sa.Column('account_subtype', sa.String(20), nullable=True))

    # Foreign key only for PostgreSQL (SQLite doesn't support ALTER ADD CONSTRAINT)
    if not is_sqlite:
        op.create_foreign_key('fk_accounts_crypto_wallet', 'accounts', 'crypto_wallets', ['crypto_wallet_id'], ['id'], ondelete='SET NULL')

    # Add token metadata to transactions for crypto claims
    if not column_exists('transactions', 'token_symbol'):
        op.add_column('transactions', sa.Column('token_symbol', sa.String(20), nullable=True))
    if not column_exists('transactions', 'token_amount'):
        op.add_column('transactions', sa.Column('token_amount', sa.Numeric(30, 18), nullable=True))
    if not column_exists('transactions', 'chain_id'):
        op.add_column('transactions', sa.Column('chain_id', sa.String(20), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'

    # Remove transaction columns
    if column_exists('transactions', 'chain_id'):
        op.drop_column('transactions', 'chain_id')
    if column_exists('transactions', 'token_amount'):
        op.drop_column('transactions', 'token_amount')
    if column_exists('transactions', 'token_symbol'):
        op.drop_column('transactions', 'token_symbol')

    # Remove accounts columns
    if not is_sqlite:
        op.drop_constraint('fk_accounts_crypto_wallet', 'accounts', type_='foreignkey')
    if column_exists('accounts', 'account_subtype'):
        op.drop_column('accounts', 'account_subtype')
    if column_exists('accounts', 'crypto_wallet_id'):
        op.drop_column('accounts', 'crypto_wallet_id')

    # Drop tables
    if table_exists('reward_claims'):
        op.drop_index('ix_reward_claims_user_id', table_name='reward_claims')
        op.drop_index('ix_reward_claims_tx_hash_chain', table_name='reward_claims')
        op.drop_table('reward_claims')

    if table_exists('crypto_sync_state'):
        op.drop_index('ix_crypto_sync_state_user_wallet_chain', table_name='crypto_sync_state')
        op.drop_table('crypto_sync_state')

    if table_exists('reward_contracts'):
        op.drop_index('ix_reward_contracts_chain_address', table_name='reward_contracts')
        op.drop_index('ix_reward_contracts_user_id', table_name='reward_contracts')
        op.drop_table('reward_contracts')

    if table_exists('crypto_wallets'):
        op.drop_index('ix_crypto_wallets_address', table_name='crypto_wallets')
        op.drop_index('ix_crypto_wallets_user_id', table_name='crypto_wallets')
        op.drop_table('crypto_wallets')
