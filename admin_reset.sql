UPDATE admin_users
SET password_hash = 'pbkdf2$100000$ieJKZgfUOohmuLrswjDyuQ==$XxTsczptGnpPWTfeLYAjtCFOux1m3nYDOCqjg10PKHM=',
    updated_at = unixepoch()
WHERE email = 'sahar@rossimissionsf.com';

INSERT INTO admin_users (id, email, password_hash, full_name)
VALUES (
  '0c53796f-cb18-4d28-b8d5-c40e02224867',
  'contact@milanilabs.com',
  'pbkdf2$100000$bZEx/om8gBWGZs5HmOK8AA==$QOdn/la69t2oS69PMlbE/GSmNB683DoV+1ocOWNJmNI=',
  'Babak Milani'
);
