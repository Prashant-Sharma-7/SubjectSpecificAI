# 1. Use the official lightweight Python image
FROM python:3.10-slim

# 2. Prevent Python from buffering outputs (good for server logs)
ENV PYTHONUNBUFFERED=1

# 3. Install system-level dependencies: Poppler for pdf2image
RUN apt-get update && apt-get install -y \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 4. Set the working directory inside the container
WORKDIR /app

# 5. Copy your requirements file first
COPY requirements.txt .

# 6. Install the Python packages
RUN pip install --no-cache-dir -r requirements.txt

# 7. Copy the rest of your backend code into the container
COPY . .

# 8. Start the FastAPI server using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]