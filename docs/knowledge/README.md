# DreamLog Knowledge Base

This directory contains public knowledge used by Dream Agent RAG.

## Structure

- `zhougong/`: traditional dream-symbol notes.
- `symbolism/`: general dream-symbol interpretation notes.
- `psychology/`: psychology-oriented reflection notes.

## Indexing

From `dreamlog-backend`, run:

```powershell
$env:PYTHONPATH=(Get-Location).Path
python -m app.rag.index_knowledge
```

The command reads this directory, chunks supported `.md` and `.txt` files, creates local fallback embeddings, and writes rows to `knowledge_documents` and `knowledge_chunks`.

You can index a custom directory:

```powershell
python -m app.rag.index_knowledge --root C:\path\to\knowledge
```
