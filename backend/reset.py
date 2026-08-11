import os
import shutil
import subprocess

def reset_data():
    print("\n⚠️  Starting AiGuardian Data Reset...")
    
    # Paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    sqlite_db_path = os.path.join(base_dir, "..", "frontend", "prisma", "dev.db")
    sqlite_journal_path = os.path.join(base_dir, "..", "frontend", "prisma", "dev.db-journal")
    chroma_db_path = os.path.join(base_dir, "vector_store", "chroma_db")
    frontend_dir = os.path.join(base_dir, "..", "frontend")
    
    # 1. Delete SQLite DB
    if os.path.exists(sqlite_db_path):
        try:
            os.remove(sqlite_db_path)
            print(f"✅ Deleted SQLite DB: dev.db")
        except Exception as e:
            print(f"❌ Failed to delete SQLite DB: {e}. (Make sure the bot/frontend is not running!)")
    else:
        print(f"ℹ️ SQLite DB not found, skipping.")
        
    if os.path.exists(sqlite_journal_path):
        try:
            os.remove(sqlite_journal_path)
        except:
            pass
    
    # 2. Delete ChromaDB vector store
    if os.path.exists(chroma_db_path):
        try:
            shutil.rmtree(chroma_db_path)
            print(f"✅ Deleted ChromaDB vector store.")
        except Exception as e:
            print(f"❌ Failed to delete ChromaDB: {e}. (Make sure the bot is not running!)")
    else:
        print(f"ℹ️ ChromaDB folder not found, skipping.")
        
    # 3. Re-initialize Prisma Database
    print("⚙️  Rebuilding Prisma SQLite Database...")
    try:
        # Run npx prisma db push
        subprocess.run("npx prisma db push", cwd=frontend_dir, check=True, shell=True)
        print("✅ Prisma Database rebuilt successfully!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to run Prisma command: {e}")
        
    print("\n🎉 Reset Complete! You can now start fresh.")

if __name__ == "__main__":
    print("="*50)
    print("   AiGuardian Hard Reset Utility")
    print("="*50)
    confirm = input("⚠️  WARNING: This will delete ALL users, messages, tasks, and memory.\nAre you sure you want to proceed? (y/n): ")
    
    if confirm.lower() == 'y':
        reset_data()
    else:
        print("Reset cancelled.")
