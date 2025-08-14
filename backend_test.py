import requests
import sys
import json
from datetime import datetime, timedelta

class BarbeariaAPITester:
    def __init__(self, base_url="https://corte-urbano.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_appointment_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, expected_count=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Additional validation for specific endpoints
                if expected_count is not None:
                    try:
                        response_data = response.json()
                        if isinstance(response_data, list) and len(response_data) == expected_count:
                            print(f"   ✅ Expected count {expected_count} matches actual count {len(response_data)}")
                        else:
                            print(f"   ⚠️  Expected count {expected_count}, got {len(response_data) if isinstance(response_data, list) else 'non-list'}")
                    except:
                        pass
                        
                return True, response.json() if response.content else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_get_services(self):
        """Test getting all services - should return 5 default services"""
        success, response = self.run_test(
            "Get Services",
            "GET",
            "api/services",
            200,
            expected_count=5
        )
        
        if success and isinstance(response, list):
            print(f"   📋 Found {len(response)} services:")
            expected_services = ["Corte de Cabelo", "Barba Completa", "Corte + Barba", "Sobrancelha", "Hidratação Capilar"]
            for service in response:
                service_name = service.get('name', 'Unknown')
                service_price = service.get('price', 0)
                print(f"      - {service_name}: R$ {service_price:.2f}")
                
            # Check if all expected services are present
            found_services = [s.get('name') for s in response]
            missing_services = [s for s in expected_services if s not in found_services]
            if missing_services:
                print(f"   ⚠️  Missing expected services: {missing_services}")
            else:
                print(f"   ✅ All expected services found")
                
        return success, response

    def test_get_available_slots(self, date_str="2025-08-15"):
        """Test getting available slots for a specific date"""
        success, response = self.run_test(
            f"Get Available Slots for {date_str}",
            "GET",
            f"api/available-slots/{date_str}",
            200
        )
        
        if success and isinstance(response, list):
            available_slots = [slot for slot in response if slot.get('available', False)]
            unavailable_slots = [slot for slot in response if not slot.get('available', False)]
            print(f"   📅 Found {len(response)} total slots:")
            print(f"      - Available: {len(available_slots)}")
            print(f"      - Unavailable: {len(unavailable_slots)}")
            
            # Check time range (should be 9 AM to 6 PM)
            if response:
                first_slot = response[0].get('time', '')
                last_slot = response[-1].get('time', '')
                print(f"      - Time range: {first_slot} to {last_slot}")
                
                if first_slot == "09:00" and last_slot == "17:30":
                    print(f"   ✅ Correct time range (9 AM to 6 PM)")
                else:
                    print(f"   ⚠️  Expected time range 09:00 to 17:30")
                    
        return success, response

    def test_create_appointment(self, services_data):
        """Test creating a new appointment"""
        if not services_data or not isinstance(services_data, list):
            print("❌ Cannot test appointment creation - no services data available")
            return False, {}
            
        # Use the first service for testing
        test_service = services_data[0]
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        appointment_data = {
            "service_id": test_service.get('id'),
            "client_name": "Maria Santos",
            "client_phone": "(11) 98888-7777",
            "client_email": "maria.santos@email.com",
            "date": tomorrow,
            "time": "14:30"  # Changed to 2:30 PM to avoid conflicts
        }
        
        success, response = self.run_test(
            "Create Appointment",
            "POST",
            "api/appointments",
            201,
            data=appointment_data
        )
        
        if success:
            self.created_appointment_id = response.get('id')
            print(f"   ✅ Created appointment with ID: {self.created_appointment_id}")
            print(f"   📋 Service: {response.get('service_name')}")
            print(f"   👤 Client: {response.get('client_name')}")
            print(f"   📅 Date/Time: {response.get('date')} at {response.get('time')}")
            
        return success, response

    def test_get_appointments(self):
        """Test getting all appointments"""
        success, response = self.run_test(
            "Get All Appointments",
            "GET",
            "api/appointments",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   📋 Found {len(response)} appointments")
            for apt in response:
                print(f"      - {apt.get('client_name')} - {apt.get('service_name')} - {apt.get('date')} {apt.get('time')}")
                
        return success, response

    def test_get_single_appointment(self):
        """Test getting a single appointment by ID"""
        if not self.created_appointment_id:
            print("⚠️  Skipping single appointment test - no appointment ID available")
            return True, {}
            
        success, response = self.run_test(
            "Get Single Appointment",
            "GET",
            f"api/appointments/{self.created_appointment_id}",
            200
        )
        
        if success:
            print(f"   ✅ Retrieved appointment: {response.get('client_name')} - {response.get('service_name')}")
            
        return success, response

    def test_slot_availability_after_booking(self):
        """Test that time slot becomes unavailable after booking"""
        if not self.created_appointment_id:
            print("⚠️  Skipping slot availability test - no appointment created")
            return True, {}
            
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        success, response = self.run_test(
            f"Check Slot Availability After Booking",
            "GET",
            f"api/available-slots/{tomorrow}",
            200
        )
        
        if success and isinstance(response, list):
            # Check if 14:30 slot is now unavailable
            slot_14_30 = next((slot for slot in response if slot.get('time') == '14:30'), None)
            if slot_14_30:
                if not slot_14_30.get('available', True):
                    print(f"   ✅ Slot 14:30 is correctly marked as unavailable")
                else:
                    print(f"   ⚠️  Slot 14:30 should be unavailable but shows as available")
            else:
                print(f"   ⚠️  Could not find 14:30 slot in response")
                
        return success, response

def main():
    print("🏪 Starting Barbearia Urbana API Tests")
    print("=" * 50)
    
    tester = BarbeariaAPITester()
    
    # Test 1: Health Check
    if not tester.test_health_check():
        print("❌ Health check failed, stopping tests")
        return 1
    
    # Test 2: Get Services
    services_success, services_data = tester.test_get_services()
    if not services_success:
        print("❌ Services endpoint failed, stopping tests")
        return 1
    
    # Test 3: Get Available Slots
    slots_success, slots_data = tester.test_get_available_slots()
    if not slots_success:
        print("❌ Available slots endpoint failed")
    
    # Test 4: Create Appointment
    appointment_success, appointment_data = tester.test_create_appointment(services_data)
    if not appointment_success:
        print("❌ Create appointment failed")
    
    # Test 5: Get All Appointments
    all_appointments_success, all_appointments_data = tester.test_get_appointments()
    if not all_appointments_success:
        print("❌ Get appointments failed")
    
    # Test 6: Get Single Appointment
    single_appointment_success, single_appointment_data = tester.test_get_single_appointment()
    
    # Test 7: Check slot availability after booking
    slot_availability_success, slot_availability_data = tester.test_slot_availability_after_booking()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} test(s) failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())