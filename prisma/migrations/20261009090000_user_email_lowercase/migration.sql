-- Keep canonical user identifiers independent of application validation.
ALTER TABLE "User"
  ADD CONSTRAINT "user_email_lowercase"
  CHECK ("email" = lower("email"));
