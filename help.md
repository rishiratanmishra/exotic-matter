# 🦙 Ollama Docker Guide (Exotic Matter)

Aapka Ollama server ab Docker container ke andar chal raha hai. Isse manage karne ke liye niche diye gaye commands ka use karein:

## 1. Models ki List dekhna
Kaun-kaun se models installed hain ye dekhne ke liye:
```bash
docker exec ollama ollama list
```

## 2. Naya Model Install karna
Agar aap naya model (jaise llama3, phi3) download karna chahte hain:
```bash
docker exec -it ollama ollama pull <model_name>
```
*Example: `docker exec -it ollama ollama pull llama3`*

## 3. Ollama Stop/Start karna
Agar aapko Docker container restart karna ho:
- **Stop**: `docker stop ollama`
- **Start**: `docker start ollama`
- **Restart**: `docker restart ollama`

## 4. Model Delete karna
Kuch delete karne ke liye:
```bash
docker exec ollama ollama rm <model_name>
```

---
**Tip**: `llama3:8b` aapke hardware (Integrated GPU) ke liye best model hai.
