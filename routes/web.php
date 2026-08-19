<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PatientUltrasoundController;
use App\Http\Controllers\PatientPdfController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard & Notifications
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/api/notifications/new-patients', [DashboardController::class, 'getNewPatientNotifications'])->name('notifications.new_patients');

    // Patient Details & History & Medical Info
    Route::get('/patient/{hn}', [PatientController::class, 'show'])->name('patient.show');
    Route::get('/patient/{hn}/history', [PatientController::class, 'history'])->name('patient.history');
    Route::post('/patient/{hn}/medical-info', [PatientController::class, 'updateMedicalInfo'])->name('patient.medical_info.update');
    Route::post('/patient/{hn}/image', [PatientController::class, 'uploadPatientImage'])->name('patient.image.upload');

    // Ultrasound Findings Editor & Image Management
    Route::get('/patient/{hn}/ultrasound-result', [PatientUltrasoundController::class, 'editUltrasound'])->name('patient.ultrasound.edit');
    Route::get('/patient/{hn}/ultrasound-result/edit', [PatientUltrasoundController::class, 'editUltrasound'])->name('patient.ultrasound.edit.mode');
    Route::post('/patient/{hn}/ultrasound', [PatientUltrasoundController::class, 'updateUltrasound'])->name('patient.ultrasound.update');
    Route::get('/patient/{hn}/ultrasound-image', [PatientUltrasoundController::class, 'showUltrasoundUploadPage'])->name('patient.ultrasound.upload');
    Route::post('/patient/{hn}/image/upload', [PatientUltrasoundController::class, 'uploadUltrasoundImage'])->name('patient.ultrasound.upload.store');
    Route::post('/patient/{hn}/image/delete', [PatientUltrasoundController::class, 'deleteUltrasoundImage'])->name('patient.ultrasound.image.delete');

    // Automatic Redirects for Legacy / Cached URLs
    Route::get('/patient/{hn}/image/upload', function (string $hn) {
        return redirect()->to('/patient/' . $hn . '/ultrasound-image' . (request()->getQueryString() ? '?' . request()->getQueryString() : ''));
    });
    Route::get('/patient/{hn}/ultrasound/upload', function (string $hn) {
        return redirect()->to('/patient/' . $hn . '/ultrasound-image' . (request()->getQueryString() ? '?' . request()->getQueryString() : ''));
    });
    Route::get('/patient/{hn}/result/edit', function (string $hn) {
        return redirect()->to('/patient/' . $hn . '/ultrasound-result' . (request()->getQueryString() ? '?' . request()->getQueryString() : ''));
    });
    Route::get('/patient/{hn}/ultrasound/edit', function (string $hn) {
        return redirect()->to('/patient/' . $hn . '/ultrasound-result' . (request()->getQueryString() ? '?' . request()->getQueryString() : ''));
    });

    // PDF Reports (Findings Form & Image Print)
    Route::get('/patient/{hn}/pdf', [PatientPdfController::class, 'downloadUltrasoundPdf'])->name('patient.ultrasound.pdf');
    Route::get('/patient/{hn}/image/pdf', [PatientPdfController::class, 'downloadUltrasoundImagePdf'])->name('patient.ultrasound.image.pdf');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::get('/settings', [ProfileController::class, 'settings'])->name('settings');
});

require __DIR__.'/auth.php';
