import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { UserService, UserProfile, ShelfItem } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, DatePipe],
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {

  profile:       UserProfile | null = null;
  profileForm:   FormGroup;
  isEditing      = false;
  isLoading      = true;
  isSaving       = false;
  saveSuccess    = false;
  errorMessage   = '';

  booksRead        = 0;
  currentlyReading = 0;
  wantToRead       = 0;

  readonly availableGenres = [
    'Fiction', 'Mystery', 'Science Fiction', 'Fantasy',
    'Thriller', 'Romance', 'Non-Fiction', 'Biography', 'History', 'Self-Help'
  ];
  selectedInterests: string[] = [];

  readonly genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

  readonly countries = [
    'Afghanistan','Argentina','Australia','Austria','Bangladesh','Belgium','Brazil','Canada',
    'Chile','China','Colombia','Czech Republic','Denmark','Egypt','Ethiopia','Finland',
    'France','Germany','Ghana','Greece','Hungary','India','Indonesia','Iran','Iraq',
    'Ireland','Israel','Italy','Japan','Kenya','Malaysia','Mexico','Morocco','Netherlands',
    'New Zealand','Nigeria','Norway','Pakistan','Philippines','Poland','Portugal','Romania',
    'Russia','Saudi Arabia','Singapore','South Africa','South Korea','Spain','Sweden',
    'Switzerland','Tanzania','Thailand','Turkey','Uganda','Ukraine',
    'United Arab Emirates','United Kingdom','United States','Vietnam'
  ];

  readonly maxDob = new Date().toISOString().split('T')[0];

  uploadingImage = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      displayName:       ['', [Validators.required, Validators.maxLength(100)]],
      bio:               [''],
      profilePictureUrl: [''],
      dateOfBirth:       [''],
      gender:            [''],
      country:           ['']
    });
  }

  ngOnInit(): void {
    this.userService.getMyProfile().subscribe({
      next: (p) => {
        this.profile = p;
        this.selectedInterests = [...p.interests];
        this.patchForm(p);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
    this.userService.getMyShelf().subscribe({
      next: (items: ShelfItem[]) => {
        this.booksRead        = items.filter(i => i.status === 'COMPLETED').length;
        this.currentlyReading = items.filter(i => i.status === 'READING').length;
        this.wantToRead       = items.filter(i => i.status === 'WANT_TO_READ').length;
      }
    });
  }

  patchForm(p: UserProfile): void {
    this.profileForm.patchValue({
      displayName:       p.displayName ?? '',
      bio:               p.bio ?? '',
      profilePictureUrl: p.profilePictureUrl ?? '',
      dateOfBirth:       p.dateOfBirth ?? '',
      gender:            p.gender ?? '',
      country:           p.country ?? ''
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.errorMessage = '';
    if (!this.isEditing && this.profile) this.patchForm(this.profile);
  }

  toggleInterest(genre: string): void {
    const idx = this.selectedInterests.indexOf(genre);
    idx === -1 ? this.selectedInterests.push(genre) : this.selectedInterests.splice(idx, 1);
  }

  isSelected(genre: string): boolean {
    return this.selectedInterests.includes(genre);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.isSaving = true;
    this.userService.updateProfile({
      ...this.profileForm.value,
      interests: this.selectedInterests
    }).subscribe({
      next: (p) => {
        this.profile = p;
        this.selectedInterests = [...p.interests];
        this.isSaving    = false;
        this.isEditing   = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = err.error?.message || 'Failed to save profile.';
      }
    });
  }

  get readingProgressPct(): number {
    const total = this.booksRead + this.currentlyReading + this.wantToRead;
    if (total === 0) return 0;
    return Math.round((this.booksRead / total) * 100);
  }

  get avatarLetter(): string {
    return this.profile?.displayName ? this.profile.displayName.charAt(0).toUpperCase() : '?';
  }

  onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage = 'Image must be under 2 MB.';
      return;
    }
    this.uploadingImage = true;
    const reader = new FileReader();
    reader.onload = () => {
      this.profileForm.patchValue({ profilePictureUrl: reader.result as string });
      this.uploadingImage = false;
    };
    reader.readAsDataURL(file);
  }

  signOut(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goBack(): void { this.router.navigate(['/home']); }
}
