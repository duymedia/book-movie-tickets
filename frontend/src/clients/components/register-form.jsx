import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import { cn } from "../lib/utils";
import axios from "axios";
import { useToast } from "../hooks/use-toast";
import { VerifyEmailModal } from "./verify-email-modal";

// List of country codes
const countryCodes = [
  { name: "Afghanistan", code: "+93", pattern: /^[0-9]{9}$/ },
  { name: "Albania", code: "+355", pattern: /^[0-9]{9}$/ },
  { name: "Algeria", code: "+213", pattern: /^[0-9]{9}$/ },
  { name: "Andorra", code: "+376", pattern: /^[0-9]{6}$/ },
  { name: "Angola", code: "+244", pattern: /^[0-9]{9}$/ },
  { name: "Antigua and Barbuda", code: "+1-268", pattern: /^[0-9]{7}$/ },
  { name: "Argentina", code: "+54", pattern: /^[0-9]{10}$/ },
  { name: "Armenia", code: "+374", pattern: /^[0-9]{8}$/ },
  { name: "Australia", code: "+61", pattern: /^[0-9]{9}$/ },
  { name: "Austria", code: "+43", pattern: /^[0-9]{10}$/ },
  { name: "Azerbaijan", code: "+994", pattern: /^[0-9]{9}$/ },
  { name: "Bahamas", code: "+1-242", pattern: /^[0-9]{7}$/ },
  { name: "Bahrain", code: "+973", pattern: /^[0-9]{8}$/ },
  { name: "Bangladesh", code: "+880", pattern: /^[0-9]{10}$/ },
  { name: "Barbados", code: "+1-246", pattern: /^[0-9]{7}$/ },
  { name: "Belarus", code: "+375", pattern: /^[0-9]{9}$/ },
  { name: "Belgium", code: "+32", pattern: /^[0-9]{9}$/ },
  { name: "Belize", code: "+501", pattern: /^[0-9]{7}$/ },
  { name: "Benin", code: "+229", pattern: /^[0-9]{8}$/ },
  { name: "Bhutan", code: "+975", pattern: /^[0-9]{8}$/ },
  { name: "Bolivia", code: "+591", pattern: /^[0-9]{8}$/ },
  { name: "Bosnia and Herzegovina", code: "+387", pattern: /^[0-9]{8}$/ },
  { name: "Botswana", code: "+267", pattern: /^[0-9]{8}$/ },
  { name: "Brazil", code: "+55", pattern: /^[0-9]{10,11}$/ },
  { name: "Brunei", code: "+673", pattern: /^[0-9]{7}$/ },
  { name: "Bulgaria", code: "+359", pattern: /^[0-9]{9}$/ },
  { name: "Burkina Faso", code: "+226", pattern: /^[0-9]{8}$/ },
  { name: "Burundi", code: "+257", pattern: /^[0-9]{8}$/ },
  { name: "Cambodia", code: "+855", pattern: /^[0-9]{8,9}$/ },
  { name: "Cameroon", code: "+237", pattern: /^[0-9]{9}$/ },
  { name: "Canada", code: "+1", pattern: /^[0-9]{10}$/ },
  { name: "Cape Verde", code: "+238", pattern: /^[0-9]{7}$/ },
  { name: "Central African Republic", code: "+236", pattern: /^[0-9]{8}$/ },
  { name: "Chad", code: "+235", pattern: /^[0-9]{8}$/ },
  { name: "Chile", code: "+56", pattern: /^[0-9]{9}$/ },
  { name: "China", code: "+86", pattern: /^[0-9]{11}$/ },
  { name: "Colombia", code: "+57", pattern: /^[0-9]{10}$/ },
  { name: "Comoros", code: "+269", pattern: /^[0-9]{7}$/ },
  { name: "Congo", code: "+242", pattern: /^[0-9]{9}$/ },
  { name: "Congo, Democratic Republic", code: "+243", pattern: /^[0-9]{9}$/ },
  { name: "Costa Rica", code: "+506", pattern: /^[0-9]{8}$/ },
  { name: "Croatia", code: "+385", pattern: /^[0-9]{9}$/ },
  { name: "Cuba", code: "+53", pattern: /^[0-9]{8}$/ },
  { name: "Cyprus", code: "+357", pattern: /^[0-9]{8}$/ },
  { name: "Czech Republic", code: "+420", pattern: /^[0-9]{9}$/ },
  { name: "Denmark", code: "+45", pattern: /^[0-9]{8}$/ },
  { name: "Djibouti", code: "+253", pattern: /^[0-9]{8}$/ },
  { name: "Dominica", code: "+1-767", pattern: /^[0-9]{7}$/ },
  { name: "Dominican Republic", code: "+1-809", pattern: /^[0-9]{7}$/ },
  { name: "Ecuador", code: "+593", pattern: /^[0-9]{9}$/ },
  { name: "Egypt", code: "+20", pattern: /^[0-9]{10}$/ },
  { name: "El Salvador", code: "+503", pattern: /^[0-9]{8}$/ },
  { name: "Equatorial Guinea", code: "+240", pattern: /^[0-9]{9}$/ },
  { name: "Eritrea", code: "+291", pattern: /^[0-9]{7}$/ },
  { name: "Estonia", code: "+372", pattern: /^[0-9]{8}$/ },
  { name: "Eswatini", code: "+268", pattern: /^[0-9]{8}$/ },
  { name: "Ethiopia", code: "+251", pattern: /^[0-9]{9}$/ },
  { name: "Fiji", code: "+679", pattern: /^[0-9]{7}$/ },
  { name: "Finland", code: "+358", pattern: /^[0-9]{9}$/ },
  { name: "France", code: "+33", pattern: /^[0-9]{9}$/ },
  { name: "Gabon", code: "+241", pattern: /^[0-9]{7}$/ },
  { name: "Gambia", code: "+220", pattern: /^[0-9]{7}$/ },
  { name: "Georgia", code: "+995", pattern: /^[0-9]{9}$/ },
  { name: "Germany", code: "+49", pattern: /^[0-9]{10,11}$/ },
  { name: "Ghana", code: "+233", pattern: /^[0-9]{9}$/ },
  { name: "Greece", code: "+30", pattern: /^[0-9]{10}$/ },
  { name: "Grenada", code: "+1-473", pattern: /^[0-9]{7}$/ },
  { name: "Guatemala", code: "+502", pattern: /^[0-9]{8}$/ },
  { name: "Guinea", code: "+224", pattern: /^[0-9]{9}$/ },
  { name: "Guinea-Bissau", code: "+245", pattern: /^[0-9]{7}$/ },
  { name: "Guyana", code: "+592", pattern: /^[0-9]{7}$/ },
  { name: "Haiti", code: "+509", pattern: /^[0-9]{8}$/ },
  { name: "Honduras", code: "+504", pattern: /^[0-9]{8}$/ },
  { name: "Hungary", code: "+36", pattern: /^[0-9]{9}$/ },
  { name: "Iceland", code: "+354", pattern: /^[0-9]{7}$/ },
  { name: "India", code: "+91", pattern: /^[0-9]{10}$/ },
  { name: "Indonesia", code: "+62", pattern: /^[0-9]{10,12}$/ },
  { name: "Iran", code: "+98", pattern: /^[0-9]{10}$/ },
  { name: "Iraq", code: "+964", pattern: /^[0-9]{10}$/ },
  { name: "Ireland", code: "+353", pattern: /^[0-9]{9}$/ },
  { name: "Israel", code: "+972", pattern: /^[0-9]{9}$/ },
  { name: "Italy", code: "+39", pattern: /^[0-9]{10}$/ },
  { name: "Jamaica", code: "+1-876", pattern: /^[0-9]{7}$/ },
  { name: "Japan", code: "+81", pattern: /^[0-9]{10}$/ },
  { name: "Jordan", code: "+962", pattern: /^[0-9]{9}$/ },
  { name: "Kazakhstan", code: "+7", pattern: /^[0-9]{10}$/ },
  { name: "Kenya", code: "+254", pattern: /^[0-9]{9}$/ },
  { name: "Kiribati", code: "+686", pattern: /^[0-9]{8}$/ },
  { name: "Korea, North", code: "+850", pattern: /^[0-9]{8}$/ },
  { name: "Korea, South", code: "+82", pattern: /^[0-9]{10}$/ },
  { name: "Kuwait", code: "+965", pattern: /^[0-9]{8}$/ },
  { name: "Kyrgyzstan", code: "+996", pattern: /^[0-9]{9}$/ },
  { name: "Laos", code: "+856", pattern: /^[0-9]{8,10}$/ },
  { name: "Latvia", code: "+371", pattern: /^[0-9]{8}$/ },
  { name: "Lebanon", code: "+961", pattern: /^[0-9]{8}$/ },
  { name: "Lesotho", code: "+266", pattern: /^[0-9]{8}$/ },
  { name: "Liberia", code: "+231", pattern: /^[0-9]{9}$/ },
  { name: "Libya", code: "+218", pattern: /^[0-9]{9}$/ },
  { name: "Liechtenstein", code: "+423", pattern: /^[0-9]{7}$/ },
  { name: "Lithuania", code: "+370", pattern: /^[0-9]{8}$/ },
  { name: "Luxembourg", code: "+352", pattern: /^[0-9]{9}$/ },
  { name: "Madagascar", code: "+261", pattern: /^[0-9]{9}$/ },
  { name: "Malawi", code: "+265", pattern: /^[0-9]{9}$/ },
  { name: "Malaysia", code: "+60", pattern: /^[0-9]{9,10}$/ },
  { name: "Maldives", code: "+960", pattern: /^[0-9]{7}$/ },
  { name: "Mali", code: "+223", pattern: /^[0-9]{8}$/ },
  { name: "Malta", code: "+356", pattern: /^[0-9]{8}$/ },
  { name: "Marshall Islands", code: "+692", pattern: /^[0-9]{7}$/ },
  { name: "Mauritania", code: "+222", pattern: /^[0-9]{8}$/ },
  { name: "Mauritius", code: "+230", pattern: /^[0-9]{8}$/ },
  { name: "Mexico", code: "+52", pattern: /^[0-9]{10}$/ },
  { name: "Micronesia", code: "+691", pattern: /^[0-9]{7}$/ },
  { name: "Moldova", code: "+373", pattern: /^[0-9]{8}$/ },
  { name: "Monaco", code: "+377", pattern: /^[0-9]{8}$/ },
  { name: "Mongolia", code: "+976", pattern: /^[0-9]{8}$/ },
  { name: "Montenegro", code: "+382", pattern: /^[0-9]{8}$/ },
  { name: "Morocco", code: "+212", pattern: /^[0-9]{9}$/ },
  { name: "Mozambique", code: "+258", pattern: /^[0-9]{9}$/ },
  { name: "Myanmar", code: "+95", pattern: /^[0-9]{9}$/ },
  { name: "Namibia", code: "+264", pattern: /^[0-9]{9}$/ },
  { name: "Nauru", code: "+674", pattern: /^[0-9]{7}$/ },
  { name: "Nepal", code: "+977", pattern: /^[0-9]{10}$/ },
  { name: "Netherlands", code: "+31", pattern: /^[0-9]{9}$/ },
  { name: "New Zealand", code: "+64", pattern: /^[0-9]{9}$/ },
  { name: "Nicaragua", code: "+505", pattern: /^[0-9]{8}$/ },
  { name: "Niger", code: "+227", pattern: /^[0-9]{8}$/ },
  { name: "Nigeria", code: "+234", pattern: /^[0-9]{10}$/ },
  { name: "North Macedonia", code: "+389", pattern: /^[0-9]{8}$/ },
  { name: "Norway", code: "+47", pattern: /^[0-9]{8}$/ },
  { name: "Oman", code: "+968", pattern: /^[0-9]{8}$/ },
  { name: "Pakistan", code: "+92", pattern: /^[0-9]{10}$/ },
  { name: "Palau", code: "+680", pattern: /^[0-9]{7}$/ },
  { name: "Palestine", code: "+970", pattern: /^[0-9]{9}$/ },
  { name: "Panama", code: "+507", pattern: /^[0-9]{8}$/ },
  { name: "Papua New Guinea", code: "+675", pattern: /^[0-9]{8}$/ },
  { name: "Paraguay", code: "+595", pattern: /^[0-9]{9}$/ },
  { name: "Peru", code: "+51", pattern: /^[0-9]{9}$/ },
  { name: "Philippines", code: "+63", pattern: /^[0-9]{10}$/ },
  { name: "Poland", code: "+48", pattern: /^[0-9]{9}$/ },
  { name: "Portugal", code: "+351", pattern: /^[0-9]{9}$/ },
  { name: "Qatar", code: "+974", pattern: /^[0-9]{8}$/ },
  { name: "Romania", code: "+40", pattern: /^[0-9]{9}$/ },
  { name: "Russia", code: "+7", pattern: /^[0-9]{10}$/ },
  { name: "Rwanda", code: "+250", pattern: /^[0-9]{9}$/ },
  { name: "Saint Kitts and Nevis", code: "+1-869", pattern: /^[0-9]{7}$/ },
  { name: "Saint Lucia", code: "+1-758", pattern: /^[0-9]{7}$/ },
  {
    name: "Saint Vincent and the Grenadines",
    code: "+1-784",
    pattern: /^[0-9]{7}$/,
  },
  { name: "Samoa", code: "+685", pattern: /^[0-9]{7}$/ },
  { name: "San Marino", code: "+378", pattern: /^[0-9]{10}$/ },
  { name: "Sao Tome and Principe", code: "+239", pattern: /^[0-9]{7}$/ },
  { name: "Saudi Arabia", code: "+966", pattern: /^[0-9]{9}$/ },
  { name: "Senegal", code: "+221", pattern: /^[0-9]{9}$/ },
  { name: "Serbia", code: "+381", pattern: /^[0-9]{9}$/ },
  { name: "Seychelles", code: "+248", pattern: /^[0-9]{7}$/ },
  { name: "Sierra Leone", code: "+232", pattern: /^[0-9]{8}$/ },
  { name: "Singapore", code: "+65", pattern: /^[0-9]{8}$/ },
  { name: "Slovakia", code: "+421", pattern: /^[0-9]{9}$/ },
  { name: "Slovenia", code: "+386", pattern: /^[0-9]{8}$/ },
  { name: "Solomon Islands", code: "+677", pattern: /^[0-9]{7}$/ },
  { name: "Somalia", code: "+252", pattern: /^[0-9]{9}$/ },
  { name: "South Africa", code: "+27", pattern: /^[0-9]{9}$/ },
  { name: "South Sudan", code: "+211", pattern: /^[0-9]{9}$/ },
  { name: "Spain", code: "+34", pattern: /^[0-9]{9}$/ },
  { name: "Sri Lanka", code: "+94", pattern: /^[0-9]{9}$/ },
  { name: "Sudan", code: "+249", pattern: /^[0-9]{9}$/ },
  { name: "Suriname", code: "+597", pattern: /^[0-9]{7}$/ },
  { name: "Sweden", code: "+46", pattern: /^[0-9]{9}$/ },
  { name: "Switzerland", code: "+41", pattern: /^[0-9]{9}$/ },
  { name: "Syria", code: "+963", pattern: /^[0-9]{9}$/ },
  { name: "Taiwan", code: "+886", pattern: /^[0-9]{9}$/ },
  { name: "Tajikistan", code: "+992", pattern: /^[0-9]{9}$/ },
  { name: "Tanzania", code: "+255", pattern: /^[0-9]{9}$/ },
  { name: "Thailand", code: "+66", pattern: /^[0-9]{9}$/ },
  { name: "Timor-Leste", code: "+670", pattern: /^[0-9]{8}$/ },
  { name: "Togo", code: "+228", pattern: /^[0-9]{8}$/ },
  { name: "Tonga", code: "+676", pattern: /^[0-9]{7}$/ },
  { name: "Trinidad and Tobago", code: "+1-868", pattern: /^[0-9]{7}$/ },
  { name: "Tunisia", code: "+216", pattern: /^[0-9]{8}$/ },
  { name: "Turkey", code: "+90", pattern: /^[0-9]{10}$/ },
  { name: "Turkmenistan", code: "+993", pattern: /^[0-9]{8}$/ },
  { name: "Tuvalu", code: "+688", pattern: /^[0-9]{6}$/ },
  { name: "Uganda", code: "+256", pattern: /^[0-9]{9}$/ },
  { name: "Ukraine", code: "+380", pattern: /^[0-9]{9}$/ },
  { name: "United Arab Emirates", code: "+971", pattern: /^[0-9]{9}$/ },
  { name: "United Kingdom", code: "+44", pattern: /^[0-9]{10}$/ },
  { name: "United States", code: "+1", pattern: /^[0-9]{10}$/ },
  { name: "Uruguay", code: "+598", pattern: /^[0-9]{8}$/ },
  { name: "Uzbekistan", code: "+998", pattern: /^[0-9]{9}$/ },
  { name: "Vanuatu", code: "+678", pattern: /^[0-9]{7}$/ },
  { name: "Venezuela", code: "+58", pattern: /^[0-9]{10}$/ },
  { name: "Vietnam", code: "+84", pattern: /^[0-9]{9,10}$/ },
  { name: "Yemen", code: "+967", pattern: /^[0-9]{9}$/ },
  { name: "Zambia", code: "+260", pattern: /^[0-9]{9}$/ },
  { name: "Zimbabwe", code: "+263", pattern: /^[0-9]{9}$/ },
];

/**
 * @param {{
 *   onSubmit: (formData: { fullname: string, phone: string, email: string, password: string, confirmPassword: string }) => void,
 *   errors: { fullname?: string, phone?: string, email?: string, password?: string, confirmPassword?: string },
 *   setErrors: (errors: { fullname?: string, phone?: string, email?: string, password?: string, confirmPassword?: string }) => void
 * }} props
 */
export function RegisterForm({ onSubmit, errors, setErrors }) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullname: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    countryCode: countryCodes[0].code, // Default to Vietnam
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState("");
  const [registrationTime, setRegistrationTime] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullname.trim()) {
      newErrors.fullname = "Họ và tên không được để trống";
    }
    const selectedCountry = countryCodes.find(
      (c) => c.code === formData.countryCode
    );
    if (!formData.phone.match(selectedCountry.pattern)) {
      newErrors.phone = `Số điện thoại không hợp lệ cho ${selectedCountry.name} (VD: ${selectedCountry.code}123456789)`;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Email không hợp lệ";
    }
    if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const normalizePhoneNumber = () => {
    let phone = formData.phone.replace(/[^0-9]/g, ""); // Remove non-digits
    if (phone.startsWith("0")) {
      phone = phone.substring(1); // Remove leading 0
    }
    return `${formData.countryCode}${phone}`; // Combine with country code
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    const normalizedPhone = normalizePhoneNumber();

    try {
      const response = await axios.post(
        "http://localhost:8080/api/auth/register",
        {
          name: formData.fullname,
          phone: normalizedPhone, // Send normalized phone (e.g., +84334713016)
          email: formData.email,
          password: formData.password,
        }
      );
      console.log("Register API Response:", response.data);

      setRegistrationEmail(formData.email);
      setRegistrationTime(Date.now());
      setShowVerifyModal(true);
      showToast(
        "Đăng ký thành công!",
        "Vui lòng kiểm tra email để xác thực tài khoản.",
        "default"
      );
      onSubmit(formData);
    } catch (error) {
      console.error("Register Error:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.message ||
        "Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.";
      showToast("Lỗi đăng ký", errorMessage, "destructive");
      setErrors({
        email: errorMessage.includes("Email") ? errorMessage : null,
        phone: errorMessage.includes("Số điện thoại") ? errorMessage : null,
        fullname: errorMessage.includes("Tên") ? errorMessage : null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (title, description, variant = "default") => {
    console.log(
      `Showing toast: ${title} - ${description} [Variant: ${variant}]`
    );
    toast({
      title,
      description,
      variant,
      className: cn(
        "text-white border-0 flex items-center",
        variant === "destructive"
          ? "bg-red-500"
          : "bg-gradient-to-r from-red-500 to-purple-600"
      ),
      icon:
        variant === "destructive" ? (
          <AlertCircle className="w-5 h-5 mr-2" />
        ) : (
          <CheckCircle className="w-5 h-5 mr-2" />
        ),
      duration: 3000,
    });
  };

  return (
    <>
      <div className="space-y-4 mt-6 pb-4">
        <form onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="fullname" className="text-gray-300">
              Họ và tên
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="fullname"
                name="fullname"
                placeholder="Nguyễn Văn A"
                value={formData.fullname}
                onChange={handleInputChange}
                className={cn(
                  "pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500",
                  errors.fullname && "border-red-500"
                )}
                required
                disabled={isLoading}
              />
              {errors.fullname && (
                <p className="text-red-400 text-xs mt-1">{errors.fullname}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-300">
              Số điện thoại
            </Label>
            <div className="flex space-x-2">
              <select
                name="countryCode"
                value={formData.countryCode}
                onChange={handleInputChange}
                className={cn(
                  "w-[30%] bg-gray-800/50 border-gray-600 text-white rounded-md px-3 py-2 focus:border-cyan-500 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
                  errors.phone && "border-red-500"
                )}
                disabled={isLoading}
                aria-label="Mã quốc gia"
              >
                {countryCodes.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </select>
              <div className="relative w-[70%]">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="phone"
                  name="phone"
                  placeholder="334713016"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={cn(
                    "w-full pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500",
                    errors.phone && "border-red-500"
                  )}
                  required
                  disabled={isLoading}
                />
                {errors.phone && (
                  <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email" className="text-gray-300">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="reg-email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
                className={cn(
                  "pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500",
                  errors.email && "border-red-500"
                )}
                required
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reg-password" className="text-gray-300">
              Mật khẩu
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="reg-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                value={formData.password}
                onChange={handleInputChange}
                className={cn(
                  "pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500",
                  errors.password && "border-red-500"
                )}
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-300">
              Xác nhận mật khẩu
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Xác nhận mật khẩu"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={cn(
                  "pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500",
                  errors.confirmPassword && "border-red-500"
                )}
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <Checkbox id="terms" disabled={isLoading} />
            <Label htmlFor="terms" className="text-sm text-gray-400">
              Tôi đồng ý với{" "}
              <a href="#" className="text-cyan-400 hover:underline">
                Điều khoản dịch vụ
              </a>{" "}
              và{" "}
              <a href="#" className="text-cyan-400 hover:underline">
                Chính sách bảo mật
              </a>
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white border-0 h-11 mt-6 rounded-lg font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105"
            disabled={isLoading}
          >
            {isLoading ? "Đang đăng ký..." : "Đăng ký"}
          </Button>
        </form>
      </div>

      {showVerifyModal && (
        <VerifyEmailModal
          email={registrationEmail}
          registrationTime={registrationTime}
          onClose={() => setShowVerifyModal(false)}
        />
      )}
    </>
  );
}
