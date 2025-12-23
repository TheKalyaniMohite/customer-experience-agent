from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

DATABASE_URL = "sqlite+aiosqlite:///./customer_experience.db"

engine = create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def run_migrations(conn):
    """Run schema migrations for existing databases."""
    # Get existing columns in the tickets table
    result = await conn.execute(text("PRAGMA table_info(tickets)"))
    columns = {row[1] for row in result.fetchall()}
    
    # Add missing columns to tickets table
    if "category" not in columns:
        print("Migration: Adding 'category' column to tickets table...")
        await conn.execute(text(
            "ALTER TABLE tickets ADD COLUMN category VARCHAR(100) DEFAULT 'general'"
        ))
        print("Migration: 'category' column added successfully.")
    
    if "closed_at" not in columns:
        print("Migration: Adding 'closed_at' column to tickets table...")
        await conn.execute(text(
            "ALTER TABLE tickets ADD COLUMN closed_at DATETIME"
        ))
        print("Migration: 'closed_at' column added successfully.")


async def init_db():
    """Initialize the database and create all tables."""
    from app.db.models import Base
    
    async with engine.begin() as conn:
        # Create all tables (will not recreate existing ones)
        await conn.run_sync(Base.metadata.create_all)
        
        # Check if tickets table exists before running migrations
        result = await conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'"
        ))
        if result.fetchone():
            await run_migrations(conn)


async def get_db():
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


