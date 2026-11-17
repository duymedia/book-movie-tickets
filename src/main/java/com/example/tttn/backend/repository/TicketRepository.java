package com.example.tttn.backend.repository;

import com.example.tttn.backend.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
}