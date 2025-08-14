import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar } from './components/ui/calendar';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Calendar as CalendarIcon, Clock, MapPin, Phone, MessageCircle, Scissors, User, Settings, Home } from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/services`);
      setServices(response.data);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const response = await axios.get(`${BACKEND_URL}/api/available-slots/${dateString}`);
      setAvailableSlots(response.data);
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/appointments`);
      setAppointments(response.data);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService || !selectedTime || !clientForm.name || !clientForm.phone) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const appointmentData = {
        service_id: selectedService.id,
        client_name: clientForm.name,
        client_phone: clientForm.phone,
        client_email: clientForm.email,
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime
      };

      const response = await axios.post(`${BACKEND_URL}/api/appointments`, appointmentData);
      
      setConfirmationData({
        ...response.data,
        service: selectedService
      });
      setShowConfirmation(true);
      
      // Reset form
      setSelectedService(null);
      setSelectedTime('');
      setClientForm({ name: '', phone: '', email: '' });
      fetchAvailableSlots();
      
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      alert('Erro ao realizar agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (date) => {
    return new Intl.DateFormat('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const HomePage = () => (
    <div className="home-page">
      <div className="hero-section">
        <img 
          src="https://customer-assets.emergentagent.com/job_corte-urbano/artifacts/lsx7htp1_IMG-20250812-WA0025.jpg" 
          alt="Barbearia Urbana Logo" 
          className="logo"
        />
        <h1 className="welcome-title">Bem-vindo à Barbearia Urbana</h1>
        <p className="welcome-subtitle">
          Tradição, estilo e modernidade em cada corte. <br />
          A melhor experiência de barbearia da cidade.
        </p>
        
        <div className="action-buttons">
          <Button 
            onClick={() => setCurrentPage('booking')} 
            className="cta-button primary"
            size="lg"
          >
            <CalendarIcon className="mr-2" />
            Agendar Horário
          </Button>
          <Button 
            onClick={() => setCurrentPage('services')} 
            className="cta-button secondary"
            variant="outline"
            size="lg"
          >
            <Scissors className="mr-2" />
            Nossos Serviços
          </Button>
          <Button 
            onClick={() => setCurrentPage('contact')} 
            className="cta-button secondary"
            variant="outline"
            size="lg"
          >
            <MapPin className="mr-2" />
            Contato
          </Button>
        </div>
      </div>
    </div>
  );

  const ServicesPage = () => (
    <div className="services-page">
      <h2 className="page-title">Nossos Serviços</h2>
      <p className="page-description">
        Serviços profissionais com técnicas modernas e tradicionais
      </p>
      
      <div className="services-grid">
        {services.map((service) => (
          <Card key={service.id} className="service-card">
            <CardHeader>
              <CardTitle className="service-name">{service.name}</CardTitle>
              <CardDescription className="service-description">
                {service.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="service-details">
                <Badge className="price-badge">
                  {formatPrice(service.price)}
                </Badge>
                <Badge variant="outline" className="duration-badge">
                  <Clock className="w-3 h-3 mr-1" />
                  {service.duration_minutes} min
                </Badge>
              </div>
              <Button 
                onClick={() => {
                  setSelectedService(service);
                  setCurrentPage('booking');
                }}
                className="book-service-button"
                size="sm"
              >
                Agendar Este Serviço
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="services-footer">
        <Button 
          onClick={() => setCurrentPage('booking')} 
          className="cta-button primary"
          size="lg"
        >
          <CalendarIcon className="mr-2" />
          Agendar Agora
        </Button>
      </div>
    </div>
  );

  const BookingPage = () => (
    <div className="booking-page">
      <h2 className="page-title">Agendar Horário</h2>
      <p className="page-description">
        Escolha o serviço, data e horário que melhor se adequa à sua agenda
      </p>

      <div className="booking-container">
        <div className="booking-steps">
          
          {/* Step 1: Select Service */}
          <Card className="booking-step">
            <CardHeader>
              <CardTitle className="step-title">
                <span className="step-number">1</span>
                Escolha o Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="services-selection">
                {services.map((service) => (
                  <div 
                    key={service.id}
                    className={`service-option ${selectedService?.id === service.id ? 'selected' : ''}`}
                    onClick={() => setSelectedService(service)}
                  >
                    <div className="service-info">
                      <h4>{service.name}</h4>
                      <p>{service.description}</p>
                    </div>
                    <div className="service-meta">
                      <Badge className="price-badge">{formatPrice(service.price)}</Badge>
                      <Badge variant="outline">{service.duration_minutes} min</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Select Date */}
          <Card className="booking-step">
            <CardHeader>
              <CardTitle className="step-title">
                <span className="step-number">2</span>
                Escolha a Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="calendar-container">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="booking-calendar"
                  disabled={(date) => date < new Date(new Date().toDateString())}
                />
                {selectedDate && (
                  <p className="selected-date">
                    Data selecionada: {formatDate(selectedDate)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Select Time */}
          {selectedDate && (
            <Card className="booking-step">
              <CardHeader>
                <CardTitle className="step-title">
                  <span className="step-number">3</span>
                  Escolha o Horário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="time-slots">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      className={`time-slot ${!slot.available ? 'unavailable' : ''} ${selectedTime === slot.time ? 'selected' : ''}`}
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Client Information */}
          {selectedService && selectedDate && selectedTime && (
            <Card className="booking-step">
              <CardHeader>
                <CardTitle className="step-title">
                  <span className="step-number">4</span>
                  Seus Dados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBookingSubmit} className="client-form">
                  <div className="form-group">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={clientForm.name}
                      onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                      placeholder="Digite seu nome completo"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={clientForm.phone}
                      onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={clientForm.email}
                      onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                      placeholder="seuemail@exemplo.com"
                    />
                  </div>

                  <div className="booking-summary">
                    <h4>Resumo do Agendamento:</h4>
                    <p><strong>Serviço:</strong> {selectedService.name}</p>
                    <p><strong>Data:</strong> {formatDate(selectedDate)}</p>
                    <p><strong>Horário:</strong> {selectedTime}</p>
                    <p><strong>Valor:</strong> {formatPrice(selectedService.price)}</p>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="confirm-booking-button"
                    size="lg"
                  >
                    {loading ? 'Agendando...' : 'Confirmar Agendamento'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="confirmation-dialog">
          <DialogHeader>
            <DialogTitle>Agendamento Confirmado! ✅</DialogTitle>
            <DialogDescription>
              Seu horário foi reservado com sucesso na Barbearia Urbana
            </DialogDescription>
          </DialogHeader>
          
          {confirmationData && (
            <div className="confirmation-details">
              <h4>Detalhes do Agendamento:</h4>
              <p><strong>Código:</strong> #{confirmationData.id.slice(-8).toUpperCase()}</p>
              <p><strong>Serviço:</strong> {confirmationData.service_name}</p>
              <p><strong>Data:</strong> {formatDate(new Date(confirmationData.date + 'T00:00:00'))}</p>
              <p><strong>Horário:</strong> {confirmationData.time}</p>
              <p><strong>Cliente:</strong> {confirmationData.client_name}</p>
              <p><strong>Telefone:</strong> {confirmationData.client_phone}</p>
              <p><strong>Valor:</strong> {formatPrice(confirmationData.service?.price || 0)}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowConfirmation(false)}>
              Fechar
            </Button>
            <Button onClick={() => setCurrentPage('home')} className="primary">
              Voltar ao Início
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  const ContactPage = () => (
    <div className="contact-page">
      <h2 className="page-title">Contato</h2>
      <p className="page-description">
        Entre em contato conosco ou visite nossa barbearia
      </p>

      <div className="contact-content">
        <Card className="contact-card">
          <CardHeader>
            <CardTitle>
              <MapPin className="mr-2" />
              Localização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Rua das Flores, 123 - Centro</p>
            <p>São Paulo, SP - CEP: 01234-567</p>
            
            <div className="map-container">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.196!2d-46.633308!3d-23.550520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzAxLjkiUyA0NsKwMzcnNTkuOSJX!5e0!3m2!1spt-BR!2sbr!4v1"
                width="100%"
                height="200"
                style={{ border: 0, borderRadius: '8px' }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
            </div>
          </CardContent>
        </Card>

        <Card className="contact-card">
          <CardHeader>
            <CardTitle>
              <Phone className="mr-2" />
              Telefone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>(11) 99999-8888</p>
            <Button 
              className="contact-button"
              onClick={() => window.open('tel:+5511999998888')}
            >
              <Phone className="mr-2" />
              Ligar Agora
            </Button>
          </CardContent>
        </Card>

        <Card className="contact-card">
          <CardHeader>
            <CardTitle>
              <MessageCircle className="mr-2" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Fale conosco pelo WhatsApp</p>
            <Button 
              className="contact-button whatsapp"
              onClick={() => window.open('https://wa.me/5511999998888?text=Olá, gostaria de agendar um horário na Barbearia Urbana')}
            >
              <MessageCircle className="mr-2" />
              Enviar Mensagem
            </Button>
          </CardContent>
        </Card>

        <Card className="contact-card">
          <CardHeader>
            <CardTitle>Horário de Funcionamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Segunda à Sexta:</strong> 09:00 - 18:00</p>
            <p><strong>Sábado:</strong> 09:00 - 17:00</p>
            <p><strong>Domingo:</strong> Fechado</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const AdminPage = () => {
    useEffect(() => {
      fetchAppointments();
    }, []);

    return (
      <div className="admin-page">
        <h2 className="page-title">Painel Administrativo</h2>
        
        <Tabs defaultValue="appointments" className="admin-tabs">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
            <TabsTrigger value="services">Serviços</TabsTrigger>
          </TabsList>
          
          <TabsContent value="appointments" className="space-y-4">
            <div className="appointments-list">
              <h3>Agendamentos do Dia</h3>
              {appointments.filter(apt => apt.date === new Date().toISOString().split('T')[0]).length === 0 ? (
                <p>Nenhum agendamento para hoje</p>
              ) : (
                appointments
                  .filter(apt => apt.date === new Date().toISOString().split('T')[0])
                  .map((appointment) => (
                    <Card key={appointment.id} className="appointment-card">
                      <CardContent className="pt-4">
                        <div className="appointment-info">
                          <h4>{appointment.client_name}</h4>
                          <p><strong>Serviço:</strong> {appointment.service_name}</p>
                          <p><strong>Horário:</strong> {appointment.time}</p>
                          <p><strong>Telefone:</strong> {appointment.client_phone}</p>
                          <Badge 
                            className={appointment.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'}
                          >
                            {appointment.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="services" className="space-y-4">
            <div className="services-management">
              <h3>Gerenciar Serviços</h3>
              <div className="services-grid">
                {services.map((service) => (
                  <Card key={service.id} className="service-management-card">
                    <CardHeader>
                      <CardTitle>{service.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{service.description}</p>
                      <div className="service-meta">
                        <Badge>{formatPrice(service.price)}</Badge>
                        <Badge variant="outline">{service.duration_minutes} min</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  const Navigation = () => (
    <nav className="navigation">
      <div className="nav-container">
        <img 
          src="https://customer-assets.emergentagent.com/job_corte-urbano/artifacts/lsx7htp1_IMG-20250812-WA0025.jpg" 
          alt="Barbearia Urbana" 
          className="nav-logo"
          onClick={() => setCurrentPage('home')}
        />
        
        <div className="nav-links">
          <button 
            className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentPage('home')}
          >
            <Home className="nav-icon" />
            Início
          </button>
          
          <button 
            className={`nav-link ${currentPage === 'services' ? 'active' : ''}`}
            onClick={() => setCurrentPage('services')}
          >
            <Scissors className="nav-icon" />
            Serviços
          </button>
          
          <button 
            className={`nav-link ${currentPage === 'booking' ? 'active' : ''}`}
            onClick={() => setCurrentPage('booking')}
          >
            <CalendarIcon className="nav-icon" />
            Agendar
          </button>
          
          <button 
            className={`nav-link ${currentPage === 'contact' ? 'active' : ''}`}
            onClick={() => setCurrentPage('contact')}
          >
            <MapPin className="nav-icon" />
            Contato
          </button>
          
          <button 
            className={`nav-link ${currentPage === 'admin' ? 'active' : ''}`}
            onClick={() => setCurrentPage('admin')}
          >
            <Settings className="nav-icon" />
            Admin
          </button>
        </div>
      </div>
    </nav>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'services':
        return <ServicesPage />;
      case 'booking':
        return <BookingPage />;
      case 'contact':
        return <ContactPage />;
      case 'admin':
        return <AdminPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="App">
      <Navigation />
      <main className="main-content">
        {renderCurrentPage()}
      </main>
    </div>
  );
}

export default App;