import { Component, signal, computed, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BookingData {
  date: string;
  time: string;
  room: string;
  coach: string;
}

interface BookingResponse {
  status: 'success' | 'conflict' | 'holiday';
  message: string;
  suggestions?: {
    date: string;
    time: string;
    room: string;
    coach: string;
  };
}

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.css']
})
export class BookingFormComponent implements OnInit {
  // Signal-based form fields
  date = signal('');
  time = signal('');
  room = signal('');
  coach = signal('');
  
  // Available options
  rooms = ['Room A', 'Room B', 'Room C', 'Room D'];
  coaches = ['Coach X', 'Coach Y', 'Coach Z', 'Karthik'];
  
  // Response signal
  response = signal<BookingResponse | null>(null);
  
  // Booked slots and holidays
  bookedSlots = signal<BookingData[]>([]);
  holidays = signal<string[]>([]);
  
  // API base URL
  private apiUrl = 'http://localhost:3000';
  
  constructor(private http: HttpClient) {}
  
  ngOnInit() {
    // Fetch booked slots from backend
    this.fetchBookedSlots();
    this.fetchHolidays();
  }
  
  // Fetch booked slots from backend
  fetchBookedSlots() {
    this.http.get<BookingData[]>(`${this.apiUrl}/bookedSlots`).subscribe({
      next: (data) => {
        this.bookedSlots.set(data);
      },
      error: (error) => {
        console.error('Error fetching booked slots', error);
        // Fallback to mock data if API fails
        this.bookedSlots.set([
          { date: '2025-04-15', time: '10:00', room: 'Room A', coach: 'Coach X' },
          { date: '2025-04-16', time: '14:00', room: 'Room B', coach: 'Coach Y' },
          { date: '2025-04-17', time: '09:00', room: 'Room A', coach: 'Karthik' }
        ]);
      }
    });
  }
  
  // Fetch holidays from backend
  fetchHolidays() {
    this.http.get<string[]>(`${this.apiUrl}/holidays`).subscribe({
      next: (data) => {
        this.holidays.set(data);
      },
      error: (error) => {
        console.error('Error fetching holidays', error);
        // Fallback to mock data if API fails
        this.holidays.set(['2025-01-01', '2025-12-25']);
      }
    });
  }
  
  // Computed signal for validation
  isFormValid = computed(() => {
    return (
      this.date().trim() !== '' &&
      this.time().trim() !== '' &&
      this.room().trim() !== '' &&
      this.coach().trim() !== ''
    );
  });
  
  // Check if a date is booked
  isDateBooked(dateStr: string): boolean {
    return this.bookedSlots().some(slot => slot.date === dateStr);
  }
  
  // Check if a date is a holiday
  isHoliday(dateStr: string): boolean {
    return this.holidays().includes(dateStr);
  }
  
  // Clear response when any form field changes
  clearResponse() {
    this.response.set(null);
  }
  
  // Handle form field changes
  onDateChange(value: string) {
    this.date.set(value);
    this.clearResponse();
  }
  
  onTimeChange(value: string) {
    this.time.set(value);
    this.clearResponse();
  }
  
  onRoomChange(value: string) {
    this.room.set(value);
    this.clearResponse();
  }
  
  onCoachChange(value: string) {
    this.coach.set(value);
    this.clearResponse();
  }
  
  submitForm() {
    if (!this.isFormValid()) return;
    
    const payload = {
      date: this.date(),
      time: this.time(),
      room: this.room(),
      coach: this.coach(),
    };
    
    // Use the actual backend API
    this.http.post<any>(`${this.apiUrl}/checkAvailability`, payload).subscribe({
      next: (data) => {
        // Determine the status based on the message
        let status: 'success' | 'conflict' | 'holiday' = 'conflict';
        
        if (data.message.includes('holiday')) {
          status = 'holiday';
        } else if (data.message.includes('confirmed')) {
          status = 'success';
          // Add the new booking to the local booked slots
          const newBookedSlots = [...this.bookedSlots()];
          newBookedSlots.push(payload);
          this.bookedSlots.set(newBookedSlots);
        }
        
        // Set the response with the appropriate status
        this.response.set({
          status,
          message: data.message,
          suggestions: data.suggestions
        });
        
        // If booking was successful, refresh the booked slots
        if (status === 'success') {
          this.fetchBookedSlots();
        }
      },
      error: (error) => {
        console.error('Error checking availability', error);
        this.response.set({
          status: 'conflict',
          message: 'An error occurred while checking availability. Please try again.'
        });
      }
    });
  }
  
  // Get response status class for styling
  getResponseClass(): string {
    if (!this.response()) return '';
    
    const message = this.response()?.message || '';
    
    if (message.includes('Booking confirmed')) {
      return 'success';
    } else if (message.includes('Conflict detected')) {
      return 'warning';
    } else if (message.includes('Selected date is a holiday')) {
      return 'danger';
    }
    
    // Default class for other messages
    return '';
  }
}