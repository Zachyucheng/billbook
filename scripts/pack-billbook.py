#!/usr/bin/env python3
"""
Billbook 打包脚本 — 一键打包 Windows 桌面应用
自动检查依赖、构建前端、打包为 exe。
"""

import os
import sys
import subprocess
import platform

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE_MODULES = os.path.join(PROJECT_ROOT, "node_modules")
WEB_DIR = os.path.join(PROJECT_ROOT, "web")
WEB_NODE_MODULES = os.path.join(WEB_DIR, "node_modules")


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


def check_os():
    system = platform.system()
    if system == "Windows":
        print("  ✓ 操作系统: Windows")
        return "win"
    elif system == "Darwin":
        print("  ✓ 操作系统: macOS")
        return "mac"
    else:
        print(f"  ⚠ 当前系统: {system}，仅支持 Windows / macOS 打包")
        return system.lower()


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
        print("  ⚠ 无 web/ 目录，跳过前端构建")
        out_dir = os.path.join(PROJECT_ROOT, "out")
        if not os.path.exists(out_dir):
            print("  ❌ 既无 web/ 也无 out/，无法打包")
            sys.exit(1)
        return

    step("构建 Web 前端")
    run("npm run build")
    print("  ✓ 前端构建完成")


def package_app(target_os):
    """打包桌面端"""
    step("打包 Billbook 桌面应用")

    if target_os == "win":
        print("  📦 目标: Windows (portable exe)")
        print("  ⏳ 此步骤可能需要下载额外文件，请耐心等待...")
        run("npx electron-builder --win --x64")
        dist_dir = os.path.join(PROJECT_ROOT, "dist-electron")
        print(f"\n  ✓ 打包完成！输出目录: {dist_dir}")
    elif target_os == "mac":
        print("  📦 目标: macOS (dmg)")
        run("npx electron-builder --mac --x64")
        dist_dir = os.path.join(PROJECT_ROOT, "dist-electron")
        print(f"\n  ✓ 打包完成！输出目录: {dist_dir}")
    else:
        print(f"  ❌ 不支持的打包目标: {target_os}")
        sys.exit(1)


def main():
    print()
    print("  ╔══════════════════════════════════╗")
    print("  ║   Billbook Desktop — 打包工具     ║")
    print("  ╚══════════════════════════════════╝")
    print(f"  项目路径: {PROJECT_ROOT}")

    if not check_node():
        input("\n按 Enter 键退出...")
        return

    target_os = check_os()

    install_deps()
    build_frontend()
    package_app(target_os)

    print()
    print("  ✅ 全部完成！可以在 dist-electron/ 目录找到安装包。")


if __name__ == "__main__":
    main()
