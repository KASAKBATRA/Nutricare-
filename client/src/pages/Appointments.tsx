import React, { useState } from 'react';
import UserGridModal from '@/components/UserGridModal';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Appointments() {
  const { user, isAuthenticated } = useAuth() as any;
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNutritionistModal, setShowNutritionistModal] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedNutritionist, setSelectedNutritionist] = useState<any>(null);
  const [appointmentData, setAppointmentData] = useState({
    scheduledAt: '',
    notes: '',
  });


  const { data: appointmentsRaw, isLoading } = useQuery({
    queryKey: ['/api/appointments'],
    enabled: isAuthenticated,
    retry: false,
  });
  const appointments = Array.isArray(appointmentsRaw) ? appointmentsRaw : [];

  const { data: nutritionistsRaw } = useQuery({
    queryKey: ['/api/nutritionists'],
    enabled: isAuthenticated,
    retry: false,
  });
  const nutritionists = Array.isArray(nutritionistsRaw) ? nutritionistsRaw : [];

  const bookAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/appointments', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setShowBookingForm(false);
      setSelectedNutritionist('');
      setAppointmentData({ scheduledAt: '', notes: '' });
      toast({
        title: "Success",
        description: "Appointment booked successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Nutritionist-specific data
  const { data: nutritionistAppointmentsRaw, isLoading: nutrLoading } = useQuery({
    queryKey: ['/api/nutritionist/appointments'],
    enabled: isAuthenticated,
    retry: false,
  });
  const nutritionistAppointments = Array.isArray(nutritionistAppointmentsRaw) ? nutritionistAppointmentsRaw : [];

  const decisionMutation = useMutation({
    mutationFn: async ({ id, action }: any) => {
      const res = await apiRequest('POST', `/api/nutritionist/appointments/${id}/decision`, { action });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nutritionist/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, scheduledAt }: any) => {
      const res = await apiRequest('POST', `/api/appointments/${id}/reschedule`, { scheduledAt });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nutritionist/appointments'] });
    },
  });

  const handleBookAppointment = () => {
    if (!selectedNutritionist || !appointmentData.scheduledAt) {
      toast({
        title: "Error",
        description: "Please select a nutritionist and appointment time.",
        variant: "destructive",
      });
      return;
    }

    bookAppointmentMutation.mutate({
      nutritionistId: selectedNutritionist,
      scheduledAt: new Date(appointmentData.scheduledAt),
      notes: appointmentData.notes,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'cancelled':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'completed':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout showSidebar={true}>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Appointments</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your nutritionist consultations</p>
          </div>
          <Button 
            onClick={() => setShowNutritionistModal(true)}
            className="bg-nutricare-green hover:bg-nutricare-dark"
          >
            <i className="fas fa-plus mr-2"></i>
            Book Appointment
          </Button>
        </div>

        {/* Nutritionist Selection Modal */}
        <UserGridModal
          isOpen={showNutritionistModal}
          onClose={() => setShowNutritionistModal(false)}
          nutritionists={nutritionists}
          onSelect={(nutritionist) => {
            setSelectedNutritionist(nutritionist);
            setShowNutritionistModal(false);
            setShowBookingForm(true);
          }}
        />

  {/* Booking Form */}
        {showBookingForm && selectedNutritionist && (
          <Card className="mb-8 glass shadow-lg border-none">
            <CardHeader>
              <CardTitle>Book New Appointment</CardTitle>
              <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">Nutritionist:</span> Dr. Nutritionist ({selectedNutritionist.specialization}, {selectedNutritionist.experience} yrs)
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              <div>
                <label className="block text-sm font-medium mb-2">Appointment Date & Time</label>
                <Input
                  type="datetime-local"
                  value={appointmentData.scheduledAt}
                  onChange={(e) => setAppointmentData({ ...appointmentData, scheduledAt: e.target.value })}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                <Textarea
                  value={appointmentData.notes}
                  onChange={(e) => setAppointmentData({ ...appointmentData, notes: e.target.value })}
                  placeholder="Any specific concerns or topics you'd like to discuss..."
                  rows={3}
                />
              </div>

              <div className="flex space-x-4">
                <Button 
                  onClick={handleBookAppointment}
                  disabled={bookAppointmentMutation.isPending}
                  className="bg-nutricare-green hover:bg-nutricare-dark"
                >
                  {bookAppointmentMutation.isPending ? 'Booking...' : 'Book Appointment'}
                </Button>
                <Button variant="outline" onClick={() => setShowBookingForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nutritionist dashboard: pending requests */}
        {isAuthenticated && nutritionistAppointments.length > 0 && user && (
          <Card className="mb-8 glass shadow-lg border-none">
            <CardHeader>
              <CardTitle>Incoming Appointment Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {nutritionistAppointments.map((appt: any) => (
                  <div key={appt.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <p className="font-semibold">Requested by: {appt.userId}</p>
                      <p className="text-sm text-gray-500">When: {new Date(appt.scheduledAt).toLocaleString()}</p>
                      {appt.notes && <p className="text-xs text-gray-500">Notes: {appt.notes}</p>}
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={() => decisionMutation.mutate({ id: appt.id, action: 'accept' })} className="bg-green-500">Accept</Button>
                      <Button size="sm" variant="destructive" onClick={() => decisionMutation.mutate({ id: appt.id, action: 'reject' })}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Nutritionists */}
        {nutritionists && nutritionists.length > 0 && (
          <Card className="mb-8 glass shadow-lg border-none">
            <CardHeader>
              <CardTitle>Available Nutritionists</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nutritionists.map((nutritionist: any) => (
                  <div key={nutritionist.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center mb-3">
                      <div className="w-12 h-12 bg-nutricare-green rounded-full flex items-center justify-center text-white font-semibold mr-3">
                        Dr
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Dr. Nutritionist</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{nutritionist.specialization}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p><span className="font-medium">Experience:</span> {nutritionist.experience} years</p>
                      <p><span className="font-medium">Rating:</span> ⭐ {parseFloat(nutritionist.rating || '0').toFixed(1)}</p>
                      {nutritionist.consultationFee && (
                        <p><span className="font-medium">Fee:</span> ${parseFloat(nutritionist.consultationFee).toFixed(2)}</p>
                      )}
                    </div>
                    {nutritionist.bio && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{nutritionist.bio}</p>
                    )}
                    <Button 
                      onClick={() => {
                        setSelectedNutritionist(nutritionist.id);
                        setShowBookingForm(true);
                      }}
                      className="w-full mt-3 bg-nutricare-green hover:bg-nutricare-dark"
                      size="sm"
                    >
                      Book Consultation
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

  {/* Appointments List */}
  <Card className="glass shadow-lg border-none">
          <CardHeader>
            <CardTitle>Your Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nutricare-green"></div>
              </div>
            ) : appointments && appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((appointment: any) => {
                  const { date, time } = formatDateTime(appointment.scheduledAt);
                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                          <i className="fas fa-user-md text-blue-500"></i>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Dr. Nutritionist</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Nutritionist Consultation</p>
                          {appointment.notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{appointment.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{date}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <i className="fas fa-calendar-check text-gray-400 text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No appointments yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Book your first consultation with a nutritionist to get personalized guidance.
                </p>
                <Button 
                  onClick={() => setShowBookingForm(true)}
                  className="bg-nutricare-green hover:bg-nutricare-dark"
                >
                  Book Your First Appointment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
