<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'Create_User';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'Em_id';

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'Em_id',
        'Em_Fullname',
        'EMP_STS',
        'EMP_STS_Name',
        'Em_Cer_No',
        'Sts',
        'STS_Type',
        'Degree',
        'PB_user',
        'Password',
        'Em_record',
        'Report_By',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'Password',
        'remember_token',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'name',
        'email',
    ];

    /**
     * Get the password for the user.
     *
     * @return string
     */
    public function getAuthPassword()
    {
        return $this->Password;
    }

    /**
     * Accessor for 'name' attribute so existing UI components referencing user.name work seamlessly.
     *
     * @return string
     */
    public function getNameAttribute()
    {
        return $this->attributes['Em_Fullname'] ?? $this->attributes['PB_user'] ?? '';
    }

    /**
     * Accessor for 'email' attribute so existing UI components referencing user.email work seamlessly.
     *
     * @return string
     */
    public function getEmailAttribute()
    {
        return $this->attributes['PB_user'] ?? '';
    }
}
