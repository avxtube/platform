# AVXTUBE API installer

คู่มือนี้ใช้สำหรับติดตั้งหรืออัปเดต `apps/api` จาก GitHub Release ของ private repository `avxtube/platform` ลงบน Linux Server ที่ใช้ `systemd`

ไฟล์ติดตั้งหลักคือ [`api-install.sh`](./api-install.sh) ตัวติดตั้งจะดาวน์โหลด Full Release ล่าสุด ตรวจสอบ SHA-256 แล้วติดตั้งไว้ที่ `/opt/avxtube-service`

## สิ่งที่ต้องมี

- Linux ที่ใช้ `systemd`
- ผู้ใช้ที่เรียก `sudo` ได้
- เซิร์ฟเวอร์เชื่อมต่อ `api.github.com` และ GitHub Release ผ่าน HTTPS ได้
- GitHub Release ที่สร้างจาก tag `v*` สำเร็จแล้ว
- Fine-grained personal access token สำหรับอ่าน private repository
- Production environment file ของ API

## สร้าง GitHub access token

1. เปิด [GitHub Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens/new)
2. กำหนดชื่อ เช่น `avxtube-api-installer`
3. กำหนดวันหมดอายุให้สั้นเท่าที่เหมาะสม
4. ที่ **Resource owner** เลือก owner ของ repository `avxtube`
5. ที่ **Repository access** เลือก **Only select repositories** แล้วเลือก `platform`
6. ที่ **Repository permissions** กำหนดเฉพาะ:

   ```text
   Contents: Read-only
   ```

7. กด **Generate token** แล้วบันทึก token ไว้ใน password manager เพราะ GitHub จะแสดงค่าเต็มเพียงครั้งเดียว

ถ้า organization บังคับอนุมัติ Fine-grained token ต้องรอให้ owner อนุมัติก่อนจึงจะอ่าน private repository ได้ ตัว token ใช้เพื่อดาวน์โหลด installer และ Release เท่านั้น ไม่ต้องใส่ไว้ใน `.env` ของ API และห้าม commit ลง Git

## เตรียม Environment ของ API

สร้างไฟล์บนเซิร์ฟเวอร์:

```bash
sudo install -m 600 /dev/null /root/avxtube-api.env
sudo nano /root/avxtube-api.env
```

ตัวอย่างค่าที่ต้องกำหนด:

```dotenv
NODE_ENV=production
HTTP_PORT=4000

DATABASE_URL=mongodb+srv://USER:PASSWORD@HOST/DATABASE

BETTER_AUTH_SECRET=REPLACE_WITH_A_RANDOM_SECRET
STORAGE_ENCRYPTION_KEY=REPLACE_WITH_A_DIFFERENT_RANDOM_SECRET
BETTER_AUTH_URL=https://avxtube.com
AUTH_APP_NAME=AVXTUBE
AUTH_COOKIE_DOMAIN=avxtube.com
AUTH_TRUSTED_ORIGINS=https://avxtube.com,https://admin.avxtube.com
BETTER_AUTH_COOKIE=auth_session

CORS_ORIGINS=https://avxtube.com,https://admin.avxtube.com

TURNSTILE_SECRET_KEY=REPLACE_WITH_TURNSTILE_SECRET

VDOHIDE_IMPORT_URL=https://vdohide.example.com/api/v1/remote
VDOHIDE_PLAYER_URL=https://player.example.com
VDOHIDE_SPACE_SLUG=
VDOHIDE_FOLDER_SLUG=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

สร้าง `BETTER_AUTH_SECRET` และ `STORAGE_ENCRYPTION_KEY` แยกกันได้ด้วย:

```bash
openssl rand -base64 32
```

ข้อควรระวัง:

- ห้ามใช้ `CORS_ORIGINS=*` เพราะ API เปิด `credentials`
- แยกหลาย origin ด้วย comma เช่น `https://avxtube.com,https://admin.avxtube.com`
- `STORAGE_ENCRYPTION_KEY` ใช้เข้ารหัส Access key/Secret key ของ S3 ก่อนเก็บในฐานข้อมูล ต้องเก็บค่าดั้งเดิมไว้ตลอดอายุระบบและห้ามใช้ค่าซ้ำกับ `BETTER_AUTH_SECRET`
- หากยังไม่กำหนด `STORAGE_ENCRYPTION_KEY` ระบบจะ fallback ไปใช้ `BETTER_AUTH_SECRET` เพื่อรองรับการอัปเกรด แต่ production ควรกำหนดแยกต่างหาก
- `TURNSTILE_SECRET_KEY`, `STORAGE_ENCRYPTION_KEY`, social client secrets และ `DATABASE_URL` ต้องอยู่ฝั่ง API เท่านั้น
- `VDOHIDE_IMPORT_URL` ต้องชี้ไปยัง Remote import API ของ VdoHide ส่วน `VDOHIDE_PLAYER_URL` ใช้สร้าง URL รูปแบบ `/embed/{slug}` หลังรับงานสำเร็จ
- `VDOHIDE_SPACE_SLUG` และ `VDOHIDE_FOLDER_SLUG` เป็นตัวเลือก หากไม่กำหนด VdoHide จะใช้ workspace เริ่มต้นของบัญชีจาก session ที่ส่งต่อไป
- ตรวจสอบ permission ของไฟล์ด้วย `sudo stat /root/avxtube-api.env` โดยควรเป็น mode `600`

## ติดตั้ง

อ่าน token แบบซ่อนค่าจากหน้าจอและเก็บไว้เฉพาะ shell session ปัจจุบัน:

```bash
read -rsp "GitHub token: " GITHUB_TOKEN && echo
export GITHUB_TOKEN
```

ดาวน์โหลด installer จาก private repository และติดตั้ง Release ล่าสุด:

```bash
API_ENV_FILE="/root/avxtube-api.env"

curl -fsSL \
  -H "Accept: application/vnd.github.raw+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/avxtube/platform/contents/scripts/api-install.sh?ref=main" \
  | sudo --preserve-env=GITHUB_TOKEN bash -s -- \
      --env-file "$API_ENV_FILE"
```

เมื่อติดตั้งเสร็จแล้ว ลบ token ออกจาก shell:

```bash
unset GITHUB_TOKEN
```

## ตรวจสอบสถานะ

```bash
sudo systemctl status avxtube-service
sudo journalctl -u avxtube-service -n 100 --no-pager
curl --fail http://localhost:4000/v1/health
```

ดู log แบบต่อเนื่อง:

```bash
sudo journalctl -u avxtube-service -f
```

## อัปเดต

สร้าง tag และรอให้ workflow `Build & Release API` ทำงานสำเร็จ:

```bash
git tag v0.1.6
git push origin v0.1.6
```

จากนั้นรันคำสั่งในหัวข้อ **ติดตั้ง** ซ้ำ ตัว installer จะดาวน์โหลด Full Release ล่าสุดและเก็บ `.env` เดิมไว้ หากต้องการเปลี่ยน Environment ให้แก้ `/root/avxtube-api.env` แล้วรัน installer พร้อม `--env-file` อีกครั้ง

## ถอนการติดตั้ง

โหลด token เข้าสู่ shell เหมือนขั้นตอนติดตั้ง แล้วรัน:

```bash
curl -fsSL \
  -H "Accept: application/vnd.github.raw+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/avxtube/platform/contents/scripts/api-install.sh?ref=main" \
  | sudo bash -s -- --uninstall

unset GITHUB_TOKEN
```

การถอนการติดตั้งจะหยุดและลบ service รวมถึงลบ `/opt/avxtube-service` แต่จะไม่ลบไฟล์ต้นฉบับ `/root/avxtube-api.env`

## แก้ปัญหาเบื้องต้น

### GitHub ตอบ `401 Bad credentials`

- ตรวจว่า token ยังไม่หมดอายุ
- โหลด token ใหม่ด้วย `export GITHUB_TOKEN`
- ตรวจว่าไม่ได้คัดลอกช่องว่างติดมาด้วย

### GitHub ตอบ `403` หรือ `404`

- ตรวจว่า token เลือก repository `avxtube/platform`
- ตรวจ permission `Contents: Read-only`
- ตรวจว่า organization อนุมัติ token แล้ว
- ตรวจว่ามี GitHub Release แบบ published และไม่ใช่ draft หรือ prerelease

### ไม่พบ `api-vX.Y.Z.tar.gz`

ตรวจ workflow `Build & Release API` ของ tag ล่าสุดว่า build สำเร็จและมี assets ทั้งสองไฟล์:

```text
api-vX.Y.Z.tar.gz
api-vX.Y.Z.tar.gz.sha256
```

### Service เปิดไม่สำเร็จ

```bash
sudo journalctl -u avxtube-service -n 100 --no-pager
```

ตรวจค่าหลักใน `/root/avxtube-api.env` ได้แก่ `DATABASE_URL`, `BETTER_AUTH_SECRET`, `STORAGE_ENCRYPTION_KEY`, `BETTER_AUTH_URL` และ `TURNSTILE_SECRET_KEY`
