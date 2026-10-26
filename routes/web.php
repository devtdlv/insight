<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectEventController;
use App\Http\Controllers\ProjectTrackingController;
use App\Http\Controllers\WorkspaceController;
use App\Http\Controllers\WorkspaceMemberController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Welcome')->name('home');

Route::middleware('guest')->group(function () {
    Route::get('/register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store']);

    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);

    Route::get('/forgot-password', [PasswordResetLinkController::class, 'create'])->name('password.request');
    Route::post('/forgot-password', [PasswordResetLinkController::class, 'store'])->name('password.email');

    Route::get('/reset-password/{token}', [NewPasswordController::class, 'create'])->name('password.reset');
    Route::post('/reset-password', [NewPasswordController::class, 'store'])->name('password.update');
});

Route::middleware('auth')->group(function () {
    Route::inertia('/dashboard', 'Dashboard')->name('dashboard');
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    Route::get('/workspaces', [WorkspaceController::class, 'index'])->name('workspaces.index');
    Route::get('/workspaces/create', [WorkspaceController::class, 'create'])->name('workspaces.create');
    Route::post('/workspaces', [WorkspaceController::class, 'store'])->name('workspaces.store');

    Route::scopeBindings()->group(function () {
        Route::get('/workspaces/{workspace}', [WorkspaceController::class, 'show'])->name('workspaces.show');
        Route::get('/workspaces/{workspace}/settings', [WorkspaceController::class, 'edit'])->name('workspaces.edit');
        Route::patch('/workspaces/{workspace}', [WorkspaceController::class, 'update'])->name('workspaces.update');
        Route::get('/workspaces/{workspace}/members', [WorkspaceMemberController::class, 'index'])->name('workspaces.members');

        Route::get('/workspaces/{workspace}/projects', [ProjectController::class, 'index'])->name('projects.index');
        Route::get('/workspaces/{workspace}/projects/create', [ProjectController::class, 'create'])->name('projects.create');
        Route::post('/workspaces/{workspace}/projects', [ProjectController::class, 'store'])->name('projects.store');
        Route::get('/workspaces/{workspace}/projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
        Route::get('/workspaces/{workspace}/projects/{project}/tracking', [ProjectTrackingController::class, 'show'])->name('projects.tracking');
        Route::post('/workspaces/{workspace}/projects/{project}/write-key', [ProjectTrackingController::class, 'rotate'])->name('projects.write-key.rotate');
        Route::get('/workspaces/{workspace}/projects/{project}/events', [ProjectEventController::class, 'index'])->name('projects.events');
        Route::get('/workspaces/{workspace}/projects/{project}/settings', [ProjectController::class, 'edit'])->name('projects.edit');
        Route::patch('/workspaces/{workspace}/projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
        Route::post('/workspaces/{workspace}/projects/{project}/archive', [ProjectController::class, 'archive'])->name('projects.archive');
        Route::post('/workspaces/{workspace}/projects/{project}/restore', [ProjectController::class, 'restore'])->name('projects.restore');
    });
});
