import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as TwitterStrategy } from "passport-twitter";
import { Profile } from "passport";
import prisma from "@/infra/database/database.config";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/shared/utils/auth/tokenUtils";

type OAuthProvider = "google" | "facebook" | "twitter";

const trimEnv = (value?: string) => value?.trim();

const resolveServerOrigin = () => {
  const configuredOrigin =
    trimEnv(process.env.SERVER_PUBLIC_URL) ||
    trimEnv(process.env.API_PUBLIC_URL) ||
    `http://localhost:${trimEnv(process.env.PORT) || "5000"}`;

  return configuredOrigin.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
};

const getExpectedCallbackPath = (provider: OAuthProvider) =>
  `/api/v1/auth/${provider}/callback`;

const resolveCallbackUrl = (
  provider: OAuthProvider,
  configuredUrl?: string
) => {
  const expectedPath = getExpectedCallbackPath(provider);
  const rawValue = trimEnv(configuredUrl);

  if (!rawValue) {
    return `${resolveServerOrigin()}${expectedPath}`;
  }

  try {
    const url = new URL(rawValue);
    if (url.pathname === `/auth/${provider}/callback`) {
      url.pathname = expectedPath;
    }
    return url.toString();
  } catch {
    const normalizedPath = rawValue.startsWith("/") ? rawValue : `/${rawValue}`;
    if (
      normalizedPath === expectedPath ||
      normalizedPath === `/auth/${provider}/callback`
    ) {
      return `${resolveServerOrigin()}${expectedPath}`;
    }

    return rawValue;
  }
};

const warnIfPlaceholderCredentials = (
  provider: OAuthProvider,
  clientId?: string,
  clientSecret?: string
) => {
  if (
    !clientId ||
    !clientSecret ||
    /dummy/i.test(clientId) ||
    /dummy/i.test(clientSecret)
  ) {
    console.warn(
      `[AUTH] ${provider} OAuth credentials look like placeholders. Update the ${provider.toUpperCase()} app credentials in src/server/.env.`
    );
  }
};

export default function configurePassport() {
  warnIfPlaceholderCredentials(
    "google",
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: resolveCallbackUrl(
          "google",
          process.env.NODE_ENV === "production"
            ? process.env.GOOGLE_CALLBACK_URL_PROD
            : process.env.GOOGLE_CALLBACK_URL_DEV
        ),
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: any
      ) => {
        try {
          const email = profile.emails?.[0]?.value?.trim().toLowerCase();
          if (!email) {
            return done(
              new Error(
                "Google did not return an email address for this account."
              )
            );
          }

          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            if (!user.googleId) {
              user = await prisma.user.update({
                where: { email },
                data: {
                  googleId: profile.id,
                  avatar: profile.photos![0]?.value || "",
                  emailVerified: true,
                },
              });
            }
          } else {
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName,
                googleId: profile.id,
                avatar: profile.photos![0]?.value || "",
                emailVerified: true,
              },
            });
          }

          const id = user.id;
          const newAccessToken = generateAccessToken(id);
          const newRefreshToken = generateRefreshToken(id);

          return done(null, {
            ...user,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });
        } catch (error) {
          console.error("Google Strategy error:", error);
          return done(error);
        }
      }
    )
  );

  warnIfPlaceholderCredentials(
    "facebook",
    process.env.FACEBOOK_APP_ID,
    process.env.FACEBOOK_APP_SECRET
  );
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID!,
        clientSecret: process.env.FACEBOOK_APP_SECRET!,
        callbackURL: resolveCallbackUrl(
          "facebook",
          process.env.NODE_ENV === "production"
            ? process.env.FACEBOOK_CALLBACK_URL_PROD
            : process.env.FACEBOOK_CALLBACK_URL_DEV
        ),
        profileFields: ["id", "emails", "name", "picture.type(large)"],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: any
      ) => {
        try {
          const email = profile.emails?.[0]?.value?.trim().toLowerCase();
          if (!email) {
            return done(
              new Error(
                "Facebook did not return an email address for this account."
              )
            );
          }

          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            if (!user.facebookId) {
              user = await prisma.user.update({
                where: { email },
                data: {
                  facebookId: profile.id,
                  avatar: profile.photos?.[0]?.value || "",
                  emailVerified: true,
                },
              });
            }
          } else {
            user = await prisma.user.create({
              data: {
                email,
                name: `${profile.name?.givenName} ${profile.name?.familyName}`,
                facebookId: profile.id,
                avatar: profile.photos?.[0]?.value || "",
                emailVerified: true,
              },
            });
          }

          const id = user.id;
          const newAccessToken = generateAccessToken(id);
          const newRefreshToken = generateRefreshToken(id);

          return done(null, {
            ...user,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });
        } catch (error) {
          console.error("Facebook Strategy error:", error);
          return done(error);
        }
      }
    )
  );

  warnIfPlaceholderCredentials(
    "twitter",
    process.env.TWITTER_CONSUMER_KEY,
    process.env.TWITTER_CONSUMER_SECRET
  );
  passport.use(
    new TwitterStrategy(
      {
        consumerKey: process.env.TWITTER_CONSUMER_KEY!,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET!,
        callbackURL: resolveCallbackUrl(
          "twitter",
          process.env.NODE_ENV === "production"
            ? process.env.TWITTER_CALLBACK_URL_PROD
            : process.env.TWITTER_CALLBACK_URL_DEV
        ),
        includeEmail: true,
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: any
      ) => {
        try {
          if (!profile || !profile.id) {
            console.error("Twitter profile is missing or invalid:", profile);
            return done(new Error("Failed to fetch valid Twitter profile"));
          }

          const email =
            profile.emails?.[0]?.value ||
            `twitter-${profile.id}@placeholder.com`;
          const hasVerifiedEmail = Boolean(profile.emails?.[0]?.value);
          const name =
            profile.displayName ||
            profile.username ||
            `Twitter User ${profile.id}`;
          const avatar = profile.photos?.[0]?.value || "";

          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            if (!user.twitterId) {
              user = await prisma.user.update({
                where: { email },
                data: {
                  twitterId: profile.id,
                  avatar,
                  ...(hasVerifiedEmail ? { emailVerified: true } : {}),
                },
              });
            }
          } else {
            user = await prisma.user.create({
              data: {
                email,
                name,
                twitterId: profile.id,
                avatar,
                emailVerified: hasVerifiedEmail,
              },
            });
          }

          const id = user.id;
          const newAccessToken = generateAccessToken(id);
          const newRefreshToken = generateRefreshToken(id);

          return done(null, {
            ...user,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });
        } catch (error) {
          console.error("Twitter Strategy error:", error);
          return done(error);
        }
      }
    )
  );
}
