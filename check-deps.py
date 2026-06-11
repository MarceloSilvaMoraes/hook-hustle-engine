#!/usr/bin/env python3
"""
🔍 Verificador de Dependências - Thumbnail System
"""

import subprocess
import sys
from pathlib import Path

def check_command(name, command):
    """Verifica se um comando está disponível"""
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=5)
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False

def main():
    print("=" * 60)
    print("🔍 Verificação de Dependências - Thumbnail System")
    print("=" * 60)
    print()
    
    checks = {
        "FFmpeg": (["ffmpeg", "-version"], "Para instalar: choco install ffmpeg"),
        "Python": (["python", "--version"], "Já deve estar instalado"),
        "Node.js": (["node", "--version"], "Obter em: nodejs.org"),
        "npm": (["npm", "--version"], "Vem com Node.js"),
    }
    
    all_ok = True
    for name, (cmd, msg) in checks.items():
        status = "✅" if check_command(name, cmd) else "❌"
        print(f"  {status} {name:12} - {msg}")
        if status == "❌":
            all_ok = False
    
    print()
    print("🐍 Módulos Python:")
    
    modules = {
        "rembg": "pip install rembg[cpu]",
        "PIL": "pip install pillow",
    }
    
    for module, install_cmd in modules.items():
        try:
            __import__(module)
            print(f"  ✅ {module:12} - Instalado")
        except ImportError:
            print(f"  ❌ {module:12} - Instale com: {install_cmd}")
            all_ok = False
    
    print()
    print("📦 Dependências NPM:")
    
    node_modules = Path("node_modules")
    packages = {
        "sharp": "npm install sharp",
        "@tanstack/react-start": "npm install (já deve estar)",
    }
    
    for pkg, msg in packages.items():
        pkg_path = node_modules / pkg
        status = "✅" if pkg_path.exists() else "❌"
        print(f"  {status} {pkg:30} - {msg}")
        if status == "❌":
            all_ok = False
    
    print()
    print("=" * 60)
    
    if all_ok:
        print("✅ Todas as dependências OK! Pronto para testar!")
        return 0
    else:
        print("❌ Algumas dependências faltam. Instale as indicadas acima.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
