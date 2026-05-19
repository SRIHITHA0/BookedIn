import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

function noFutureDate(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const entered = new Date(control.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return entered > today ? { futureDate: true } : null;
}
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html'
})
export class SignupComponent implements OnInit {

  signupForm: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  formSubmitAttempted = false;

  readonly availableGenres = [
    'Fiction', 'Mystery', 'Science Fiction', 'Fantasy',
    'Thriller', 'Romance', 'Non-Fiction', 'Biography', 'History', 'Self-Help'
  ];
  selectedGenres: string[] = [];

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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signupForm = this.fb.group({
      displayName:  ['', [Validators.required, Validators.maxLength(50)]],
      email:        ['', [Validators.required, Validators.email]],
      password:     ['', [Validators.required, Validators.minLength(8)]],
      dateOfBirth:  ['', [Validators.required, noFutureDate]],
      gender:       ['', Validators.required],
      country:      ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  get f() { return this.signupForm.controls; }

  toggleGenre(genre: string): void {
    const idx = this.selectedGenres.indexOf(genre);
    idx === -1 ? this.selectedGenres.push(genre) : this.selectedGenres.splice(idx, 1);
  }

  isGenreSelected(genre: string): boolean {
    return this.selectedGenres.includes(genre);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSignup(): void {
    this.formSubmitAttempted = true;
    if (this.signupForm.invalid || this.selectedGenres.length === 0) {
      this.signupForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.signup({
      ...this.signupForm.value,
      interests: this.selectedGenres
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Signup failed. Please try again.';
      }
    });
  }
}
