#!/usr/bin/env python3
"""
Deploy script using paramiko for SSH password authentication
Run: python3 deploy-with-password.py
"""

import paramiko
import sys


def deploy():
    hostname = "money.khanh.page"
    username = "godstorm91"
    password = "1@3c#.Net"
    commands = ["cd /home/godstorm91/project/smartmoney", "git pull origin main"]

    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, username=username, password=password)

        for cmd in commands:
            print(f"Executing: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            print(stdout.read().decode())
            if stderr.read():
                print(f"Stderr: {stderr.read().decode()}")

        client.close()
        print("\nDeployment completed!")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    deploy()
