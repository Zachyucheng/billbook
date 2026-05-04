#!/usr/bin/env python3
"""
Billbook 启动脚本 — 一键启动桌面端
自动检查依赖、构建前端、启动 Electron。
"""

import os
import sys
import subprocess
import shutil

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE_MODULES = os.path.join(PROJECT_ROOT, "node_modules")
WEB_DIR = os.path.join(PROJECT_ROOT, "web")
WEB_NODE_MODULES = os.path.join(WEB_DIR, "node_modules")
OUT_DIR = os.path.join(PROJECT_ROOT, "out")


def step(msg):
    print(f"\n{'='*50}")
    print(f"  {msg}")
    print(f"{'='*50}")


def run(cmd, cwd=None):
    print(f"  $ {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd or PROJECT_ROOT)
    if result.returncode != 0:
        print(f"\n  ❌ 命令失败: {cmd}")
        sys.exit(result.returncode)
    return result


def check_node():
    """检查 Node.js 是否已安装"""
    try:
        result = subprocess.run(
            "node --version", shell=True, capture_output=True, text=True
        )
        if result.returncode == 0:
            print(f"  ✓ Node.js {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    print("  ❌ 未找到 Node.js，请先安装：https://nodejs.org/")
    return False


def check_npm():
    try:
        result = subprocess.run(
            "npm --version", shell=True, capture_output=True, text=True
        )
        if result.returncode == 0:
            print(f"  ✓ npm {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    return False


def install_deps():
    """安装根目录依赖"""
    if not os.path.exists(NODE_MODULES):
        step("安装根目录依赖")
        run("npm install")
    else:
        print("  ✓ 根目录依赖已存在")

    if os.path.exists(WEB_DIR):
        if not os.path.exists(WEB_NODE_MODULES):
            step("安装 Web 前端依赖")
            run("npm install", cwd=WEB_DIR)
        else:
            print("  ✓ Web 前端依赖已存在")
    else:
        print("  ⚠ 未找到 web/ 目录，跳过前端构建")


def build_frontend():
    """构建 Web 前端"""
    if not os.path.exists(WEB_DIR):
        print("  ⚠ 无 web/ 目录，使用现有 out/")
        if not os.path.exists(OUT_DIR):
            print("  ❌ 既无 web/ 也无 out/，无法启动")
            sys.exit(1)
        return

    step("构建 Web 前端")
    run("npm run build", cwd=PROJECT_ROOT)
    print("  ✓ 前端构建完成")


def launch_electron():
    """启动 Electron 桌面端"""
    step("启动 Billbook 桌面端")
    os.chdir(PROJECT_ROOT)
    run("npx electron .")


def main():
    print()
    print("  ╔══════════════════════════════════╗")
    print("  ║     Billbook Desktop — 启动器     ║")
    print("  ╚══════════════════════════════════╝")
    print(f"  项目路径: {PROJECT_ROOT}")

    if not check_node():
        input("\n按 Enter 键退出...")
        return
    check_npm()

    install_deps()
    build_frontend()
    launch_electron()


if __name__ == "__main__":
    main()
