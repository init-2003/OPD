<?php

namespace App\Providers;

use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Auth\Authenticatable;

class CustomUserProvider extends EloquentUserProvider
{
    /**
     * Validate a user against the given credentials.
     *
     * @param  \Illuminate\Contracts\Auth\Authenticatable  $user
     * @param  array  $credentials
     * @return bool
     */
    public function validateCredentials(Authenticatable $user, array $credentials)
    {
        $plain = $credentials['password'] ?? null;
        $userPassword = $user->getAuthPassword();

        if (is_null($plain) || is_null($userPassword)) {
            return false;
        }

        // Direct comparison for legacy plain-text passwords in Create_User
        if ((string) $plain === (string) $userPassword) {
            return true;
        }

        // Fallback to standard hasher check for hashed passwords if applicable
        try {
            if ($this->hasher->info($userPassword)['algoName'] !== 'unknown') {
                return $this->hasher->check($plain, $userPassword);
            }
        } catch (\Throwable $e) {
            // Ignored if not a valid hash algorithm format
        }

        return false;
    }

    /**
     * Rehash the user's password if required.
     * Overridden to prevent auto-rehashing legacy passwords into SQL Server varchar column.
     *
     * @param  \Illuminate\Contracts\Auth\Authenticatable  $user
     * @param  array  $credentials
     * @param  bool  $force
     * @return void
     */
    public function rehashPasswordIfRequired(Authenticatable $user, array $credentials, bool $force = false)
    {
        // Do nothing to keep legacy Create_User table intact without truncation errors
    }

    /**
     * Retrieve a user by their unique identifier and "remember me" token.
     * Overridden to return null since Create_User does not support persistent remember tokens.
     *
     * @param  mixed  $identifier
     * @param  string  $token
     * @return \Illuminate\Contracts\Auth\Authenticatable|null
     */
    public function retrieveByToken($identifier, $token)
    {
        return null;
    }
}
